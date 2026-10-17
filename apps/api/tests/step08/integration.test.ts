import { describe, it, expect, vi } from 'vitest';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RgbaImage } from '@tileset/asset-core';
import { encodePng } from '@tileset/image-adapter';
import { Executor, Archiver } from '@tileset/local-executor';
import { Persistence } from '@tileset/persistence';
import { AiTaskService } from '../../src/ai-task-service.js';
import { WaveSpeedAdapter } from '../../src/wavespeed-adapter.js';
import { setup, PROFILE, databaseUrl } from '../../../../packages/persistence/tests/helpers.js';
const reply = (data: unknown) => new Response(JSON.stringify({ code: 200, data }));
describe('real-provider contract through the existing PostgreSQL executor (network mocked)', () => {
  it('Generate/Edit freeze controlled references, recover known IDs, archive only on retry, complete once and leave newer adoption intact', async () => {
    const s = await setup();
    let restarted: Persistence | undefined;
    try {
      const service = new AiTaskService(s.store, PROFILE);
      const source = await s.store.db.assetRevision.findFirstOrThrow({
        where: { projectId: s.project.id, kind: 'source', sourceSha: { not: null } },
      });
      const generated = await service.create(s.project.id, {
        operation: 'IMAGE_GENERATE',
        component: 'grass',
      });
      const edited = await service.create(
        s.project.id,
        { operation: 'IMAGE_EDIT', component: 'water', supplemental: '更柔和的水波' },
        source.id,
      );
      expect((await s.store.task(edited.id))!.snapshot.references[0]!.sha256).toBe(
        source.sourceSha,
      );
      const pixels = new Uint8Array(256 * 256 * 4);
      for (let offset = 0; offset < pixels.length; offset += 4)
        pixels.set([20, 60, 30, 255], offset);
      const png = await encodePng(new RgbaImage({ width: 256, height: 256, data: pixels }));
      let submits = 0,
        queries = 0,
        complete = false,
        failArchive = true;
      const upload = vi.fn(async () => 'https://cdn.wavespeed.ai/reference.png');
      await mkdir(resolve(s.root, 'uploads'));
      const transport: typeof fetch = async (url) => {
        if (String(url).includes('/predictions/')) {
          queries++;
          const id = String(url).split('/').at(-2);
          return reply({
            id,
            status: complete ? 'completed' : 'processing',
            outputs: ['https://cdn.wavespeed.ai/result.png'],
          });
        }
        submits++;
        const intent = await s.store.taskDetail(submits === 1 ? generated.id : edited.id);
        expect(intent.state).toBe('SUBMITTING');
        expect(intent.attempts[0]!.state).toBe('INTENT');
        return reply({ id: `real_contract_${submits}` });
      };
      const adapter = new WaveSpeedAdapter(
        'offline-test-secret',
        { upload },
        resolve(s.root, 'uploads'),
        (reference, signal) => service.referenceBytes(s.project.id, reference, signal),
        transport,
      );
      const reader = { bytes: async () => png };
      const executor = new Executor(
        s.store,
        { adapterFor: () => adapter },
        new Archiver(s.store, reader, async () => {
          if (failArchive) throw Error('archive-fault');
        }),
      );
      await executor.resume(generated.id, 'WAIT');
      await executor.resume(edited.id, 'WAIT');
      expect(upload).toHaveBeenCalledTimes(1);
      expect(submits).toBe(2);
      complete = true;
      await executor.resume(generated.id, 'QUERY_KNOWN_ID');
      expect((await s.store.taskDetail(generated.id)).archiveState).toBe('RETRY_REQUIRED');
      const beforeQueries = queries;
      failArchive = false;
      restarted = new Persistence(databaseUrl!, s.store.storage.root, PROFILE);
      const fresh = new Executor(
        restarted,
        { adapterFor: () => adapter },
        new Archiver(restarted, reader),
      );
      await fresh.resume(generated.id, 'RETRY_ARCHIVE_ONLY');
      expect(queries).toBe(beforeQueries);
      await s.store.adopt(s.project.id, 1, s.b.built.ir.dependencies);
      await fresh.resume(edited.id, 'QUERY_KNOWN_ID');
      await fresh.resume(edited.id, 'WAIT');
      expect(submits).toBe(2);
      for (const id of [generated.id, edited.id]) {
        const detail = await restarted.taskDetail(id);
        expect(detail.state).toBe('COMPLETED');
        expect(detail.artifacts).toHaveLength(1);
        expect(JSON.stringify(detail)).not.toContain('offline-test-secret');
        expect(detail.artifacts[0]!.sourceRef).toHaveProperty('originalDownload');
      }
      const project = await s.store.db.project.findUniqueOrThrow({ where: { id: s.project.id } });
      expect(project.revision).toBe(2);
      expect(project.successfulBuildId).toBeNull();
      await expect(
        service.create(
          s.project.id,
          { operation: 'IMAGE_EDIT', component: 'grass' },
          '../arbitrary-path',
        ),
      ).rejects.toThrow();
    } finally {
      await restarted?.close();
      await s.store.close();
    }
  });
  it('unknown paid submission is durable and never retried by recovery; provider rejection is sanitized', async () => {
    const s = await setup();
    try {
      const service = new AiTaskService(s.store, PROFILE);
      const task = await service.create(s.project.id, {
        operation: 'IMAGE_GENERATE',
        component: 'grass',
      });
      const transport = vi.fn(async () => {
        throw Error('secret-must-never-appear');
      });
      const adapter = new WaveSpeedAdapter(
        'offline-test-secret',
        { upload: vi.fn() },
        '/unused',
        async () => new Uint8Array(),
        transport,
      );
      const executor = new Executor(
        s.store,
        { adapterFor: () => adapter },
        new Archiver(s.store, { bytes: vi.fn() }),
      );
      await executor.resume(task.id, 'WAIT');
      await executor.resume(task.id, 'WAIT');
      await executor.recoverAll();
      expect((await s.store.task(task.id))!.state).toBe('SUBMISSION_UNKNOWN');
      expect(transport).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(await s.store.taskDetail(task.id))).not.toContain(
        'secret-must-never-appear',
      );
      const rejected = await service.create(s.project.id, {
        operation: 'IMAGE_GENERATE',
        component: 'grass',
      });
      const denial = new WaveSpeedAdapter(
        'offline-test-secret',
        { upload: vi.fn() },
        '/unused',
        async () => new Uint8Array(),
        async () => new Response('secret-must-never-appear', { status: 401 }),
      );
      await new Executor(
        s.store,
        { adapterFor: () => denial },
        new Archiver(s.store, { bytes: vi.fn() }),
      ).resume(rejected.id, 'WAIT');
      expect((await s.store.taskDetail(rejected.id)).errorCode).toBe('PROVIDER_HTTP_401');
    } finally {
      await s.store.close();
    }
  });
});
