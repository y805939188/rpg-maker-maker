import type { Express, Request, Response, NextFunction } from 'express';
import {
  AiCreateSchema,
  AiApplySchema,
  AiTaskActionSchema,
  AiCreatedSchema,
  AiAppliedSchema,
  AiReferenceSchema,
  ProjectIdSchema,
  EmptyQuerySchema,
  SavedSchema,
} from '@tileset/contracts';
import { AiStudioService } from './ai-studio-service.js';
import { failure } from './studio-errors.js';
import { requestLifetime, readHttpPng } from './studio-ingress.js';
export function mountAiStudio(server: Express, service: AiStudioService) {
  const route =
    (fn: (req: Request, res: Response, signal: AbortSignal) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      const life = requestLifetime(req, res);
      void fn(req, res, life.signal)
        .catch((e) => {
          if (!res.headersSent && !res.destroyed) next(failure(e, 'AI 创作'));
        })
        .finally(() => life.dispose());
    };
  const project = (req: Request) => {
    EmptyQuerySchema.parse(req.query);
    return ProjectIdSchema.parse(req.params['id']);
  };
  server.get(
    '/api/projects/:id/ai',
    route(async (req, res) => {
      res.json(await service.list(project(req)));
    }),
  );
  server.post(
    '/api/projects/:id/ai/create',
    route(async (req, res) => {
      res
        .status(202)
        .json(
          AiCreatedSchema.parse(await service.create(project(req), AiCreateSchema.parse(req.body))),
        );
    }),
  );
  server.post(
    '/api/projects/:id/ai/apply',
    route(async (req, res, signal) => {
      res
        .status(202)
        .json(
          AiAppliedSchema.parse(
            await service.apply(project(req), AiApplySchema.parse(req.body), signal),
          ),
        );
    }),
  );
  server.post(
    '/api/projects/:id/ai/action',
    route(async (req, res) => {
      const p = project(req),
        input = AiTaskActionSchema.parse(req.body);
      await service.action(p, input.taskId, input.action);
      res.json(SavedSchema.parse({ saved: true }));
    }),
  );
  server.post(
    '/api/projects/:id/ai/reference/upload',
    route(async (req, res, signal) => {
      res.setHeader('Connection', 'close');
      const p = project(req);
      const result = await service.studio.exclusive(
        () =>
          service.studio.store.gate.write(async () =>
            service.reference(p, await readHttpPng(req, signal), signal),
          ),
        false,
        signal,
      );
      signal.throwIfAborted();
      res.status(201).json(AiReferenceSchema.parse(result));
    }),
  );
}
