import { it, expect } from 'vitest';
import {
  chromium,
  expect as browserExpect,
  type BrowserContext,
  type Browser,
} from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { Persistence, RefSchema } from '@tileset/persistence';
import { hashBytes, fingerprint } from '@tileset/asset-core';
import { assembleExport, verifyExportFiles } from '@tileset/pack-export';
import { BuildDetailSchema } from '@tileset/contracts';
import { createApplication } from '../../../src/app.js';
import { loadEnvironment, parseConfig } from '../../../src/config.js';
import { StudioService, type Resources } from '../../../src/studio-service.js';
import { readStoredStandardZip } from '../stored-zip.js';
import { ReceivedResources } from '../received-resources.js';
import { assertReceivedPng } from '../received-png.js';
import { stopOwnedProcess, within, cleanupOwned } from '../test-lifecycle.js';

loadEnvironment();
for (const mode of ['production', 'development'] as const) {
  it(`R4 real COMMIT ${mode} browser keeps current, preview, ZIP and retirement coherent`, async (test) => {
    const root = resolve('.local/step07/r4-browser', mode + '-' + randomUUID());
    await mkdir(root, { recursive: true });
    const record = (name: string, value: unknown) =>
      writeFile(resolve(root, name + '.json'), JSON.stringify(value, null, 2) + '\n');
    const admin = new PrismaClient({ datasources: { db: { url: process.env['DATABASE_URL']! } } });
    const database = new URL(process.env['DATABASE_URL']!);
    database.pathname = '/tileset_r4_' + mode + '_' + randomUUID().replaceAll('-', '');
    let running: Awaited<ReturnType<typeof createApplication>> | undefined;
    let service: StudioService;
    let browser: Browser | undefined, vite: ChildProcess | undefined;
    const contexts: BrowserContext[] = [],
      viteLog: string[] = [],
      releases = new Set<() => void>();
    let r4CommitFence: (() => Promise<void>) | null = null;
    const resources = JSON.parse(
      await readFile('apps/api/dist/resources/studio.json', 'utf8'),
    ) as Resources;
    const config = parseConfig({
      ...process.env,
      DATABASE_URL: database.href,
      API_PORT: process.env['STEP07_TEST_API_PORT'] ?? '4377',
      WEB_PORT: process.env['WEB_PORT'] ?? '5276',
      NODE_ENV: mode,
    });
    const url = `http://127.0.0.1:${config.API_PORT}`,
      dev = `http://127.0.0.1:${config.WEB_PORT}`;
    const r = async (path: string, body?: unknown) => {
      const response = await fetch(
        url + path,
        body === undefined
          ? undefined
          : {
              method: 'POST',
              headers: {
                Origin: url,
                'X-Tileset-Client': 'local-v1',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            },
      );
      const data = await response.json();
      if (!response.ok) throw Error(JSON.stringify(data));
      return data;
    };
    const fixture = async (name: string) => {
      const project = (await r('/api/projects', { name: 'R4-' + name + '-' + randomUUID() }))
        .id as string;
      await r(`/api/projects/${project}/preset`, { family: 'art' });
      let s = await r(`/api/projects/${project}/studio`);
      const selected = Object.fromEntries(
        ['grass', 'water-0', 'water-1', 'water-2', 'mask', 'overlay'].map((c) => [
          c,
          s.sources.find((x: { component: string }) => x.component === c).id,
        ]),
      );
      await r(`/api/projects/${project}/recipe`, {
        expectedRevision: s.revision,
        sources: selected,
        style: 'component-palette',
      });
      s = await r(`/api/projects/${project}/studio`);
      return {
        project,
        recipeId: s.recipes.find((x: { current: boolean }) => x.current).id as string,
        revision: s.revision as number,
      };
    };
    const terminal = async (project: string, id: string) => {
      let actual:
        Awaited<ReturnType<typeof service.store.db.studioJob.findUniqueOrThrow>> | undefined;
      await expect
        .poll(
          async () => {
            actual = await service.store.db.studioJob.findUniqueOrThrow({
              where: { id, projectId: project },
            });
            return actual.state;
          },
          { timeout: 30000, interval: 100 },
        )
        .toMatch(/COMPLETED|FAILED/);
      return actual!;
    };
    let cleanup: Promise<void> | undefined;
    const close = () =>
      (cleanup ??= (async () => {
        for (const release of releases) release();
        r4CommitFence = null;
        await cleanupOwned([
          ...contexts.map(
            (context) => () => within(context.close(), 5000, 'browser context close'),
          ),
          async () => {
            if (browser) await within(browser.close(), 5000, 'browser close');
          },
          async () => {
            if (vite) await stopOwnedProcess(vite);
          },
          async () => {
            if (running) await within(running.close(), 15000, 'owned API close');
          },
          () => within(admin.$disconnect(), 5000, 'owned admin close'),
        ]);
      })());
    test.onTestFinished(close, 30000);
    const onAbort = () => {
      for (const release of releases) release();
      r4CommitFence = null;
      void close().catch(() => {});
    };
    test.signal.addEventListener('abort', onAbort, { once: true });
    const timing: { stage: string; ms: number; status: string }[] = [],
      started = performance.now();
    let pending = 'setup';
    const checkpoints: { stage: string; elapsedMs: number }[] = [];
    function mark(stage: string) {
      const point = { stage, elapsedMs: Math.round(performance.now() - started) };
      checkpoints.push(point);
      process.stderr.write('R4_CHECKPOINT ' + JSON.stringify(point) + '\n');
    }
    async function step<T>(stage: string, fn: () => Promise<T>): Promise<T> {
      pending = stage;
      const start = performance.now();
      process.stderr.write(
        'R4_STAGE ' +
          JSON.stringify({ stage, event: 'start', elapsedMs: Math.round(start - started) }) +
          '\n',
      );
      await record('r4-ui-progress', { stage, elapsedMs: Math.round(start - started), timing });
      try {
        test.signal.throwIfAborted();
        const value = await within(fn(), 60000, stage, test.signal);
        timing.push({ stage, ms: Math.round(performance.now() - start), status: 'completed' });
        return value;
      } catch (error) {
        timing.push({ stage, ms: Math.round(performance.now() - start), status: 'failed' });
        throw error;
      } finally {
        process.stderr.write(
          'R4_STAGE ' +
            JSON.stringify({ stage, event: 'end', ms: Math.round(performance.now() - start) }) +
            '\n',
        );
        await record('r4-ui-progress', {
          stage,
          elapsedMs: Math.round(performance.now() - started),
          timing,
        });
      }
    }
    async function barrier(stage: string, promise: Promise<void>) {
      await step(stage, async () => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(Error('Timed out waiting for ' + stage)), 60000);
            }),
          ]);
        } finally {
          clearTimeout(timer);
        }
      });
    }
    const results: unknown[] = [];
    const receivedTraces: { mode: string; capture: ReceivedResources }[] = [];
    try {
      await within(
        admin.$executeRawUnsafe(`CREATE DATABASE "${database.pathname.slice(1)}"`),
        15000,
        'create owned database',
        test.signal,
      );
      const migration = spawn(
        'pnpm',
        ['--filter', '@tileset/api', 'exec', 'prisma', 'migrate', 'deploy'],
        {
          env: { ...process.env, DATABASE_URL: database.href },
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      try {
        await within(
          new Promise<void>((accept, reject) => {
            migration.once('error', reject);
            migration.once('exit', (code) =>
              code === 0 ? accept() : reject(Error('Owned R4 migration failed')),
            );
          }),
          30000,
          'owned migration',
          test.signal,
        );
      } finally {
        await stopOwnedProcess(migration);
      }
      service = new StudioService(config, resources, resolve(root, 'assets'), async (point) => {
        if (point === 'db-transaction' && r4CommitFence) await r4CommitFence();
      });
      await service.recover();
      running = await createApplication(config, service);
      await running.app.listen(config.API_PORT, '127.0.0.1');
      await record('ownership', {
        root,
        mode,
        database: database.pathname.slice(1),
        api: config.API_PORT,
        web: mode === 'development' ? config.WEB_PORT : null,
        context: resources.context,
      });
      if (mode === 'development') {
        vite = spawn(
          'pnpm',
          [
            '--filter',
            '@tileset/web',
            'exec',
            'vite',
            '--host',
            '127.0.0.1',
            '--port',
            String(config.WEB_PORT),
            '--strictPort',
          ],
          {
            env: {
              ...process.env,
              API_PORT: String(config.API_PORT),
              WEB_PORT: String(config.WEB_PORT),
            },
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        vite.stdout?.on('data', (b) => viteLog.push(String(b)));
        vite.stderr?.on('data', (b) => viteLog.push(String(b)));
        await expect
          .poll(
            async () => {
              if (vite!.exitCode !== null) throw Error('Owned R4 Vite exited');
              try {
                return (await fetch(dev)).status;
              } catch {
                return 0;
              }
            },
            { timeout: 15000, interval: 100 },
          )
          .toBe(200);
      }
      browser = await chromium.launch();
      const f = await step(mode + ':fixture', () => fixture('ui-' + mode)),
        context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
      contexts.push(context);
      context.setDefaultTimeout(15000);
      const page = await context.newPage(),
        network: { url: string; method: string; status: number }[] = [],
        errors: string[] = [];
      const bodies = new ReceivedResources(page, mode === 'production' ? url : dev, f.project);
      await bodies.observeDocuments();
      receivedTraces.push({ mode, capture: bodies });
      page.on('response', (r) => {
        if (r.url().includes('/api/'))
          network.push({ url: r.url(), method: r.request().method(), status: r.status() });
      });
      page.on('pageerror', (e) => errors.push(e.message));
      await step(mode + ':page', () => page.goto(mode === 'production' ? url : dev));
      await page
        .getByRole('button', { name: (await service.project(f.project)).name, exact: true })
        .click();
      async function image() {
        const element = page.getByAltText('当前配方处理水面');
        await browserExpect(element).toHaveAttribute('data-project-id', f.project, {
          timeout: 15000,
        });
        await browserExpect
          .poll(() =>
            element.evaluate((i) => [
              (i as HTMLImageElement).naturalWidth,
              (i as HTMLImageElement).naturalHeight,
            ]),
          )
          .toEqual([96, 144]);
        const recipeId = await page.getByLabel('精确配方 revision').inputValue(),
          frame = await page.getByLabel('创作源水面状态').inputValue();
        await browserExpect(element).toHaveAttribute('data-recipe-id', recipeId);
        await browserExpect(element).toHaveAttribute('data-source-frame', frame);
        const receivedURL = new URL(
            `/api/projects/${f.project}/recipes/${recipeId}/processed?frame=${frame}`,
            page.url(),
          ).href,
          renderedSHA = await element.getAttribute('data-png-sha256');
        expect(renderedSHA).toMatch(/^[a-f0-9]{64}$/);
        try {
          await browserExpect
            .poll(() => bodies.find(receivedURL, renderedSHA!)?.sha, {
              message:
                'current rendered PNG requires a completed actual browser body: ' + receivedURL,
            })
            .toBe(renderedSHA);
        } catch (error) {
          const current = await element.evaluate((i) => ({
            project: i.getAttribute('data-project-id'),
            recipe: i.getAttribute('data-recipe-id'),
            frame: i.getAttribute('data-source-frame'),
            sha: i.getAttribute('data-png-sha256'),
            decoded: [(i as HTMLImageElement).naturalWidth, (i as HTMLImageElement).naturalHeight],
          }));
          const diagnostic = {
            mode,
            stage: pending,
            required: { project: f.project, recipe: recipeId, frame, sha: renderedSHA },
            current,
            capture: bodies.diagnostic(receivedURL, renderedSHA!),
          };
          process.stderr.write('R4_REQUIRED_BODY ' + JSON.stringify(diagnostic) + '\n');
          await record('r4-required-body-failure-' + mode, diagnostic);
          throw error;
        }
        const received = bodies.find(receivedURL, renderedSHA!);
        expect(
          received,
          'actual rendered recipe/frame PNG response must be captured',
        ).toBeDefined();
        expect(received!.contentType.split(';')[0]).toBe('image/png');
        const bytes = new Uint8Array(received!.bytes!);
        expect(await element.getAttribute('data-png-sha256')).toBe(hashBytes(bytes));
        assertReceivedPng(bytes, { width: 96, height: 144 });
        const expected = await sharp(bytes).ensureAlpha().raw().toBuffer(),
          actual = await element.evaluate((i) => {
            const c = document.createElement('canvas');
            c.width = 96;
            c.height = 144;
            const ctx = c.getContext('2d')!;
            ctx.drawImage(i as HTMLImageElement, 0, 0);
            return [...ctx.getImageData(0, 0, 96, 144).data];
          });
        expect(Buffer.from(actual)).toEqual(expected);
        return { project: f.project, recipeId, frame, sha: hashBytes(bytes), decoded: [96, 144] };
      }
      // Keep the already received image across a real same-document transition.
      // This adds no PNG read; full reloads still require new actual response evidence.
      await browserExpect(page.getByAltText('当前配方处理水面')).toHaveAttribute(
        'data-png-sha256',
        /^[a-f0-9]{64}$/,
        { timeout: 15000 },
      );
      await page.evaluate(() => history.replaceState({}, '', '#received-document-control'));
      await step(mode + ':processed-image', image);
      await browserExpect(
        page.getByRole('button', { name: '构建当前配套', exact: true }),
      ).toBeEnabled();
      for (const phase of ['first', 'replacement'] as const) {
        if (phase === 'replacement') {
          const upload = page.waitForResponse(
            (r) => r.request().method() === 'POST' && r.url().includes('/sources/water-0/upload'),
          );
          await step(mode + ':replacement:upload', () =>
            page.getByLabel('上传水面源帧 0', { exact: true }).setInputFiles({
              name: 'changed.png',
              mimeType: 'image/png',
              buffer: Buffer.from(resources.presets.art.sources[2]!.png, 'base64'),
            }),
          );
          expect((await upload).status()).toBe(201);
          await browserExpect(page.locator('.notice')).toContainText('新 revision');
          await step(mode + ':replacement:recipe', async () => {
            await page.getByRole('button', { name: '验证并采用固定岸线配方', exact: true }).click();
            await browserExpect(page.locator('.notice')).toContainText('固定岸线配方');
          });
          await step(mode + ':processed-image', image);
        }
        let entered!: () => void,
          allowCommit!: () => void,
          captured!: () => void,
          allowRead!: () => void,
          armed = false;
        const atCommit = new Promise<void>((r) => {
            entered = r;
          }),
          commit = new Promise<void>((r) => {
            allowCommit = r;
          }),
          atRead = new Promise<void>((r) => {
            captured = r;
          }),
          read = new Promise<void>((r) => {
            allowRead = r;
          });
        releases.add(allowCommit);
        releases.add(allowRead);
        const original = service.project.bind(service);
        r4CommitFence = async () => {
          armed = true;
          entered();
          await commit;
        };
        service.project = async (...args) => {
          const p = await original(...args);
          if (armed && args[0] === f.project) {
            armed = false;
            captured();
            await read;
          }
          return p;
        };
        try {
          const reply = page.waitForResponse(
            (r) => r.request().method() === 'POST' && r.url().endsWith('/builds'),
          );
          await page.getByRole('button', { name: '构建当前配套', exact: true }).click();
          const response = await reply;
          expect(response.status()).toBe(202);
          const accepted = (await response.json()) as { id: string };
          await barrier(mode + ':' + phase + ':commit-ready', atCommit);
          await barrier(mode + ':' + phase + ':read-held', atRead);
          allowCommit();
          const actual = await step(mode + ':' + phase + ':terminal', () =>
            terminal(f.project, accepted.id),
          );
          expect(actual.state).toBe('COMPLETED');
          mark(mode + ':' + phase + ':ui-terminal-wait');
          allowRead();
          const row = page
            .getByRole('list', { name: '构建任务' })
            .getByRole('listitem')
            .filter({ hasText: accepted.id.slice(0, 8) });
          await browserExpect(row).toContainText('完成');
          const state = await r(`/api/projects/${f.project}/studio`);
          expect(state.successfulBuildId).toBe(actual.buildId);
          expect(state.needsRebuild).toBe(false);
          mark(mode + ':' + phase + ':metadata-confirmed');
          await browserExpect(
            page.getByRole('button', { name: '退役旧组并建立第二组', exact: true }),
          ).toBeEnabled({ timeout: 15000 });
          mark(mode + ':' + phase + ':select-build');
          await row.getByRole('button', { name: '查看这次实际构建', exact: true }).click();
          await browserExpect(page.locator('canvas[aria-label="交付拼接预览"]')).toHaveAttribute(
            'data-build-id',
            actual.buildId!,
            { timeout: 15000 },
          );
          await browserExpect(
            page.getByText('画布已就绪 · 实际导出图集', { exact: false }),
          ).toBeVisible();
          mark(mode + ':' + phase + ':canvas-ready');
          const img = await step(mode + ':' + phase + ':processed-image', image),
            zip = await step(mode + ':' + phase + ':download', () =>
              fetch(`${url}/api/projects/${f.project}/builds/${actual.buildId}/download`),
            );
          expect(zip.status).toBe(200);
          const zipBytes = Buffer.from(await zip.arrayBuffer()),
            zipSHA = hashBytes(zipBytes),
            files = readStoredStandardZip(zipBytes),
            exported = await service.store.db.finalExport.findUniqueOrThrow({
              where: { buildId: actual.buildId! },
            }),
            manifest = JSON.parse(files['manifest.json']!.toString()) as Awaited<
              ReturnType<typeof verifyExportFiles>
            >['manifest'];
          mark(mode + ':' + phase + ':zip-body-and-directory');
          expect(zip.headers.get('x-content-sha256')).toBe(zipSHA);
          expect(hashBytes(files['manifest.json']!)).toBe(exported.manifestSha);
          expect(zip.headers.get('x-export-manifest-sha256')).toBe(exported.manifestSha);
          expect(manifest.identity.context.commit).toBe(resources.context.commit);
          expect(fingerprint(manifest.identity.profile)).toBe(
            '48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793',
          );
          for (const [name, meta] of Object.entries(manifest.identity.files)) {
            expect(hashBytes(files[name]!)).toBe(meta.sha256);
            expect(files[name]!.length).toBe(meta.bytes);
          }
          for (const name of ['A1.png', 'A2.png'])
            assertReceivedPng(files[name]!, { width: 768, height: 576 });
          mark(mode + ':' + phase + ':zip-verified');
          for (const name of ['A1.png', 'A2.png', 'manifest.json']) {
            const resourceURL = new URL(
                `/api/projects/${f.project}/builds/${actual.buildId}/files/${name}`,
                page.url(),
              ).href,
              requiredSHA = hashBytes(files[name]!);
            await browserExpect
              .poll(() => bodies.find(resourceURL, requiredSHA)?.sha)
              .toBe(requiredSHA);
            const actualResponse = bodies.find(resourceURL, requiredSHA);
            expect(
              actualResponse,
              'selected delivery resource must have been received by browser',
            ).toBeDefined();
            expect(actualResponse!.bytes).toEqual(files[name]);
            if (name.endsWith('.png'))
              assertReceivedPng(actualResponse!.bytes!, { width: 768, height: 576 });
          }
          mark(mode + ':' + phase + ':actual-browser-files-matched');
          const selectedScene = await page.getByLabel('检查场景').inputValue();
          await browserExpect
            .poll(() => bodies.preview(actual.buildId!, selectedScene)?.sha)
            .toBeTruthy();
          const descriptorEntry = bodies.preview(actual.buildId!, selectedScene);
          expect(descriptorEntry).toBeDefined();
          const descriptor = BuildDetailSchema.parse(
            JSON.parse(descriptorEntry!.bytes!.toString()),
          ).descriptor;
          expect(descriptor.buildId).toBe(actual.buildId);
          expect(descriptor.exportBuildId).toBe(manifest.buildId);
          expect(descriptor.manifestSha).toBe(exported.manifestSha);
          expect(descriptor.scene).toBe(selectedScene);
          await page.screenshot({ path: resolve(root, `r4-${mode}-${phase}.png`), fullPage: true });
          mark(mode + ':' + phase + ':descriptor-and-screenshot-complete');
          results.push({
            mode,
            phase,
            job: actual,
            successfulBuildId: state.successfulBuildId,
            exportManifest: exported.manifestSha,
            zipSHA,
            retireEnabled: true,
            image: img,
          });
        } finally {
          allowCommit?.();
          allowRead?.();
          service.project = original;
          r4CommitFence = null;
        }
      }
      // A genuine delayed old snapshot finishes HISTORICAL after a newer owned publication.
      const external = new Persistence(
          service.store.databaseUrl,
          service.store.storage.root,
          resources.profile,
        ),
        prepare = service.store.prepareBuild.bind(service.store);
      let ready!: (p: Awaited<ReturnType<Persistence['prepareBuild']>>) => void,
        release!: () => void;
      const prepared = new Promise<Awaited<ReturnType<Persistence['prepareBuild']>>>((r) => {
          ready = r;
        }),
        gate = new Promise<void>((r) => {
          release = r;
        });
      releases.add(release);
      service.store.prepareBuild = async (...args) => {
        const p = await prepare(...args);
        if (args[0] === f.project) {
          ready(p);
          await gate;
        }
        return p;
      };
      try {
        const reply = page.waitForResponse(
          (r) => r.request().method() === 'POST' && r.url().endsWith('/builds'),
        );
        await page.getByRole('button', { name: '构建当前配套', exact: true }).click();
        const response = await reply;
        expect(response.status()).toBe(202);
        const accepted = (await response.json()) as { id: string },
          old = await step(mode + ':history:prepared', () => prepared),
          snapshot = await step(mode + ':history:snapshot', () =>
            external.projectSnapshot(f.project),
          ),
          adopted = await step(mode + ':history:adopt', () =>
            external.adopt(
              f.project,
              snapshot.revision,
              RefSchema.array().parse(snapshot.adoption),
            ),
          ),
          ops = JSON.parse(new TextDecoder().decode(old.files['bundle.json']!)) as Parameters<
            typeof assembleExport
          >[1];
        const current = await step(mode + ':history:current-prepare', () =>
            external.prepareBuild(
              f.project,
              old.packId,
              adopted.id,
              ops.snapshot.slots
                .filter((s) => s.state === 'ACTIVE' && s.binding)
                .map((s) => ({
                  operation: 'put',
                  logicalId: s.binding!.logicalId,
                  revision: s.binding!.revision,
                  fragmentHash: s.binding!.fragment.contentHash,
                  groundId: s.binding!.groundId,
                })),
              resources.context,
            ),
          ),
          bundle = JSON.parse(
            new TextDecoder().decode(current.files['bundle.json']!),
          ) as Parameters<typeof assembleExport>[1],
          exported = await step(mode + ':history:assemble', () =>
            assembleExport(resources.profile, bundle, resources.context),
          );
        await step(mode + ':history:publish', () => external.publish(current, exported.files));
        release();
        const job = await step(mode + ':history:terminal', () => terminal(f.project, accepted.id));
        expect(job.state).toBe('COMPLETED');
        const state = await r(`/api/projects/${f.project}/studio`);
        expect(state.successfulBuildId).toBe(current.id);
        expect(state.builds.find((b: { id: string }) => b.id === old.id).current).toBe(false);
        expect(state.builds.find((b: { id: string }) => b.id === old.id).publication).toBe(
          'HISTORICAL',
        );
        const row = page
          .getByRole('list', { name: '构建任务' })
          .getByRole('listitem')
          .filter({ hasText: accepted.id.slice(0, 8) });
        await browserExpect(row).toContainText('完成');
        await page.getByLabel('实际构建').selectOption(current.id);
        await browserExpect(page.locator('canvas[aria-label="交付拼接预览"]')).toHaveAttribute(
          'data-build-id',
          current.id,
          { timeout: 15000 },
        );
        await browserExpect(
          page.getByRole('button', { name: '退役旧组并建立第二组', exact: true }),
        ).toBeEnabled({ timeout: 15000 });
        results.push({
          mode,
          phase: 'true-history-only',
          historicalJob: job,
          currentBuild: current.id,
          oldBuild: old.id,
          image: await step(mode + ':history:processed-image', image),
        });
      } finally {
        release?.();
        service.store.prepareBuild = prepare;
        await external.close();
      }
      expect(errors).toEqual([]);
      await record('r4-ui-network-' + mode, {
        sourceContext: resources.context,
        network,
        errors,
        received: bodies.snapshot(),
      });
      await context.close();
      await record('r4-ui-consistent-publication', {
        sourceContext: resources.context,
        mode,
        results,
      });
    } finally {
      for (const release of releases) release();
      r4CommitFence = null;
      await record('r4-ui-timing', {
        checkpoints,
        sourceContext: resources.context,
        pending,
        elapsedMs: Math.round(performance.now() - started),
        timing,
      });
      for (const { mode, capture } of receivedTraces) {
        capture.dispose();
        await record('r4-received-resources-' + mode, {
          sourceContext: resources.context,
          records: capture.snapshot(),
        });
      }
      await record('r4-vite', { log: viteLog });
      await close();
      test.signal.removeEventListener('abort', onAbort);
    }
  });
}
