import type { Express, Request, Response, NextFunction } from 'express';
import {
  ProjectIdSchema,
  HashSchema,
  ComponentSchema,
  UploadQuerySchema,
  PresetRequestSchema,
  RecipeRequestSchema,
  BuildRequestSchema,
  ConfirmationSchema,
  EmptyQuerySchema,
  ProcessedQuerySchema,
  PreviewQuerySchema,
  ExportFileNameSchema,
  SavedSchema,
  UploadResultSchema,
} from '@tileset/contracts';
import { hashBytes } from '@tileset/asset-core';
import { StudioService } from './studio-service.js';
import { requestLifetime, readHttpPng } from './studio-ingress.js';
import { failure, StudioError } from './studio-errors.js';
import { zipFiles } from './studio-zip.js';
export function mountStudio(server: Express, service: StudioService) {
  let reads = 0;
  const route =
    (heavy: boolean, fn: (req: Request, res: Response, signal: AbortSignal) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      if (req.path.endsWith('/upload')) res.setHeader('Connection', 'close');
      if (!heavy && reads >= 12) {
        next(
          new StudioError(
            {
              code: 'BUSY',
              message: '资源读取槽正在使用。',
              location: '资源',
              recovery: '稍后重试；不保留无限队列。',
            },
            429,
          ),
        );
        return;
      }
      if (!heavy) reads++;
      const life = requestLifetime(req, res);
      const originalSend = res.send.bind(res);
      let pending: unknown;
      const work = () => {
        res.send = ((body: unknown) => {
          pending = body;
          return res;
        }) as Response['send'];
        return fn(req, res, life.signal);
      };
      void (
        heavy
          ? service.exclusive(
              () => service.store.gate.write(work, undefined, life.signal),
              req.method === 'GET' || req.path.endsWith('/export'),
              life.signal,
            )
          : work()
      )
        .then(() => {
          res.send = originalSend;
          if (life.signal.aborted) throw life.signal.reason;
          originalSend(pending);
        })
        .catch((cause) => {
          res.send = originalSend;
          if (!res.headersSent && !res.destroyed)
            next(failure(life.signal.aborted ? life.signal.reason : cause));
        })
        .finally(() => {
          life.dispose();
          if (!heavy) reads--;
        });
    };
  const project = (req: Request) => ProjectIdSchema.parse(req.params['id']);
  const id = (req: Request, name: string) => HashSchema.parse(req.params[name]);
  const empty = (req: Request) => EmptyQuerySchema.parse(req.query);
  const png = (res: Response, bytes: Uint8Array) => {
    res.type('image/png').send(Buffer.from(bytes));
  };
  server.get(
    '/api/projects/:id/studio',
    route(false, async (req, res) => {
      empty(req);
      res.json(await service.state(project(req)));
    }),
  );
  server.post(
    '/api/projects/:id/sources/:component/upload',
    route(true, async (req, res, signal) => {
      res.setHeader('Connection', 'close');
      const component = ComponentSchema.parse(req.params['component']),
        q = UploadQuerySchema.parse(req.query),
        p = project(req);
      const bytes = await readHttpPng(req, signal),
        saved = await service.upload(p, component, Number(q.density), bytes, signal);
      signal.throwIfAborted();
      res.status(201).json(UploadResultSchema.parse(saved));
    }),
  );
  server.post(
    '/api/projects/:id/preset',
    route(true, async (req, res, signal) => {
      empty(req);
      await service.preset(project(req), PresetRequestSchema.parse(req.body).family, signal);
      res.status(201).json(SavedSchema.parse({ saved: true }));
    }),
  );
  server.post(
    '/api/projects/:id/recipe',
    route(true, async (req, res) => {
      empty(req);
      await service.recipe(project(req), RecipeRequestSchema.parse(req.body));
      res.status(201).json(SavedSchema.parse({ saved: true }));
    }),
  );
  server.post(
    '/api/projects/:id/builds',
    route(false, async (req, res) => {
      empty(req);
      res.status(202).json(await service.enqueue(project(req), BuildRequestSchema.parse(req.body)));
    }),
  );
  server.get(
    '/api/projects/:id/sources/:source/png',
    route(false, async (req, res) => {
      empty(req);
      png(res, await service.sourcePng(project(req), id(req, 'source')));
    }),
  );
  server.get(
    '/api/projects/:id/recipes/:recipe/processed',
    route(true, async (req, res) => {
      const q = ProcessedQuerySchema.parse(req.query);
      png(
        res,
        await service.processed(
          project(req),
          id(req, 'recipe'),
          q.frame === 'ground' ? -1 : Number(q.frame),
        ),
      );
    }),
  );
  server.post(
    '/api/projects/:id/builds/:build/export',
    route(true, async (req, res) => {
      empty(req);
      EmptyQuerySchema.parse(req.body);
      await service.createExport(project(req), id(req, 'build'));
      res.json(SavedSchema.parse({ saved: true }));
    }),
  );
  server.get(
    '/api/projects/:id/builds/:build/preview',
    route(true, async (req, res) => {
      const q = PreviewQuerySchema.parse(req.query);
      res.json(await service.detail(project(req), id(req, 'build'), q.scene, q.group));
    }),
  );
  server.get(
    '/api/projects/:id/builds/:build/files/:name',
    route(false, async (req, res) => {
      empty(req);
      const name = ExportFileNameSchema.parse(req.params['name']);
      const b = await service.exportFile(project(req), id(req, 'build'), name);
      res.setHeader('X-Content-SHA256', hashBytes(b));
      res
        .type(
          name.endsWith('.png')
            ? 'image/png'
            : name.endsWith('.json')
              ? 'application/json'
              : 'text/plain',
        )
        .send(Buffer.from(b));
    }),
  );
  server.get(
    '/api/projects/:id/builds/:build/profile',
    route(false, async (req, res) => {
      empty(req);
      const manifest = JSON.parse(
        new TextDecoder().decode(
          await service.exportFile(project(req), id(req, 'build'), 'manifest.json'),
        ),
      ) as { identity: { profile: unknown } };
      res.json(manifest.identity.profile);
    }),
  );
  server.get(
    '/api/projects/:id/builds/:build/download',
    route(true, async (req, res) => {
      empty(req);
      const e = await service.export(project(req), id(req, 'build')),
        bytes = zipFiles(e.files);
      res.setHeader('Content-Disposition', `attachment; filename="${e.manifest.buildId}.zip"`);
      res.setHeader('X-Content-SHA256', hashBytes(bytes));
      res.setHeader('X-Export-Manifest-SHA256', e.row.manifestSha);
      res.type('application/zip').send(bytes);
    }),
  );
  server.post(
    '/api/projects/:id/builds/:build/visual',
    route(true, async (req, res) => {
      empty(req);
      const p = project(req),
        build = id(req, 'build'),
        input = ConfirmationSchema.parse(req.body);
      const e = await service.export(p, build);
      await service.store.acceptance(build, 'VISUAL', input.confirmed ? 'PASS' : 'FAIL', {
        actor: 'USER_UI_ACTION',
        exportManifestSha: e.row.manifestSha,
        scope: 'VISUAL_ONLY_NOT_MZ',
      });
      res.json(SavedSchema.parse({ saved: true }));
    }),
  );
}
