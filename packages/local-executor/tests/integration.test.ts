import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { Persistence } from '@tileset/persistence';
import { Executor, Archiver, MockProvider } from '@tileset/local-executor';
import {
  setup,
  snapshot,
  evidence,
  PROFILE,
  databaseUrl,
} from '../../persistence/tests/helpers.js';
import { runProcess } from '../../persistence/tests/process-helper.js';

async function taskSetup() {
  const s = await setup(),
    input = snapshot(),
    task = await s.store.createTask(s.project.id, input),
    png = s.a.sources[0]!.raw.bytes(),
    remoteRoot = resolve(s.root, 'mock-remote');
  const provider = new MockProvider(remoteRoot, png);
  return { ...s, input, task, png, remoteRoot, provider };
}
describe('durable generic Executor with process-persistent Mock remote', () => {
  it('intent is durable before submit; frozen defaults/input survive fresh executor and Provider instances', async () => {
    const s = await taskSetup();
    let fresh: Persistence | undefined;
    try {
      s.input.model.parameters.nested.quality = 99;
      s.input.structuredParameters.nested.density = 77;
      s.input.prompts.main.content = 'new default';
      const newDefaults = snapshot('mock-config-v2');
      newDefaults.model.modelId = 'synthetic-image-v2';
      const newer = await s.store.createTask(s.project.id, newDefaults);
      expect((await s.store.task(newer.id))?.snapshot.configurationVersion).toBe('mock-config-v2');
      expect((await s.store.task(s.task.id))?.snapshot.configurationVersion).toBe('mock-config-v1');
      expect((await s.store.task(s.task.id))?.snapshot.model.modelId).toBe('synthetic-image');
      await new Executor(
        s.store,
        { adapterFor: () => s.provider },
        new Archiver(s.store, s.provider),
      ).requestLocalCancellation(newer.id);
      let observed = false;
      const provider = new MockProvider(s.remoteRoot, s.png, async (point) => {
        if (point === 'remote-created') {
          const detail = await s.store.taskDetail(s.task.id);
          expect(detail.state).toBe('SUBMITTING');
          expect(detail.attempts).toHaveLength(1);
          expect(detail.attempts[0]!.state).toBe('INTENT');
          observed = true;
        }
      });
      const executor = new Executor(
        s.store,
        { adapterFor: () => provider },
        new Archiver(s.store, provider),
      );
      await executor.resume(s.task.id, 'WAIT');
      expect(observed).toBe(true);
      const known = await s.store.task(s.task.id);
      expect(known?.state).toBe('REMOTE_RUNNING');
      expect(known?.snapshot.model.parameters).toEqual({ nested: { quality: 1 } });
      expect(known?.snapshot.prompts.main.content).not.toBe(s.input.prompts.main.content);
      expect(known?.predictionId).toBeTruthy();
      await s.store.close();
      fresh = new Persistence(databaseUrl!, s.store.storage.root, PROFILE);
      const remote = new MockProvider(s.remoteRoot, s.png),
        restarted = new Executor(fresh, { adapterFor: () => remote }, new Archiver(fresh, remote));
      await restarted.resume(s.task.id, 'QUERY_KNOWN_ID');
      expect(await remote.ids()).toHaveLength(1);
      expect((await fresh.task(s.task.id))?.predictionId).toBe(known?.predictionId);
      await remote.complete(known!.predictionId!);
      await restarted.resume(s.task.id, 'QUERY_KNOWN_ID');
      expect((await fresh.task(s.task.id))?.state).toBe('COMPLETED');
      expect(await remote.ids()).toHaveLength(1);
      await evidence('executor-reconstruction', {
        task: s.task.id,
        predictionId: known?.predictionId,
        state: (await fresh.task(s.task.id))?.state,
        frozenConfiguration: known?.snapshot.configurationVersion,
        remoteIds: await remote.ids(),
      });
    } finally {
      await fresh?.close();
      await s.store.close();
    }
  });
  it('SIGKILL after remote creation without local ID produces SUBMISSION_UNKNOWN without resubmission', async () => {
    const s = await taskSetup();
    try {
      const killed = await runProcess(
        {
          mode: 'task',
          root: s.store.storage.root,
          remoteRoot: s.remoteRoot,
          png: Buffer.from(s.png).toString('base64'),
          taskId: s.task.id,
          stopAt: 'remote-created',
        },
        'remote-created',
      );
      expect(killed.signal).toBe('SIGKILL');
      expect((await s.store.task(s.task.id))?.state).toBe('SUBMITTING');
      expect(await s.provider.ids()).toHaveLength(1);
      const restarted = await runProcess({
        mode: 'task',
        root: s.store.storage.root,
        remoteRoot: s.remoteRoot,
        png: Buffer.from(s.png).toString('base64'),
        taskId: s.task.id,
      });
      expect(restarted.code).toBe(0);
      const unknown = await s.store.taskDetail(s.task.id);
      expect(unknown.state).toBe('SUBMISSION_UNKNOWN');
      expect(unknown.predictionId).toBeNull();
      expect(unknown.attempts[0]?.state).toBe('UNKNOWN');
      await runProcess({
        mode: 'task',
        root: s.store.storage.root,
        remoteRoot: s.remoteRoot,
        png: Buffer.from(s.png).toString('base64'),
        taskId: s.task.id,
      });
      expect(await s.provider.ids()).toHaveLength(1);
      await evidence('unknown-process-kill', {
        killed,
        restarted,
        task: s.task.id,
        attempt: unknown.attempts,
        remoteIds: await s.provider.ids(),
        policy:
          'RECONCILE_UNKNOWN_NO_RESUBMIT; local IDs do not guarantee third-party billing idempotency',
      });
    } finally {
      await s.store.close();
    }
  });
  it('SIGKILL after known ID queries that same remote task after restart', async () => {
    const s = await taskSetup();
    try {
      const killed = await runProcess(
        {
          mode: 'task',
          root: s.store.storage.root,
          remoteRoot: s.remoteRoot,
          png: Buffer.from(s.png).toString('base64'),
          taskId: s.task.id,
          stopAt: 'external-id-durable',
        },
        'external-id-durable',
      );
      expect(killed.signal).toBe('SIGKILL');
      const before = await s.store.task(s.task.id);
      expect(before?.state).toBe('REMOTE_RUNNING');
      await s.provider.complete(before!.predictionId!);
      const restarted = await runProcess({
        mode: 'task',
        root: s.store.storage.root,
        remoteRoot: s.remoteRoot,
        png: Buffer.from(s.png).toString('base64'),
        taskId: s.task.id,
      });
      expect((await s.store.task(s.task.id))?.state).toBe('COMPLETED');
      expect((await s.store.task(s.task.id))?.predictionId).toBe(before?.predictionId);
      expect(await s.provider.ids()).toHaveLength(1);
      await evidence('known-id-process-restart', {
        killed,
        restarted,
        task: s.task.id,
        predictionId: before?.predictionId,
      });
    } finally {
      await s.store.close();
    }
  });
  it('remote success + archive failure retries archive only; repeated completion adds no asset or publish', async () => {
    const s = await taskSetup();
    try {
      let fail = true,
        queries = 0;
      const adapter = {
        ...s.provider,
        provider: 'mock' as const,
        adapterVersion: s.provider.adapterVersion,
        submit: s.provider.submit.bind(s.provider),
        query: async (id: string, signal: AbortSignal) => {
          queries++;
          return s.provider.query(id, signal);
        },
      };
      const executor = new Executor(
        s.store,
        { adapterFor: () => adapter },
        new Archiver(s.store, s.provider, async (point) => {
          if (fail && point === 'archive-files-durable') throw Error('archive-injected');
        }),
      );
      await executor.resume(s.task.id, 'WAIT');
      const known = await s.store.task(s.task.id);
      await s.provider.complete(known!.predictionId!);
      await executor.resume(s.task.id, 'QUERY_KNOWN_ID');
      expect((await s.store.taskDetail(s.task.id)).archiveState).toBe('RETRY_REQUIRED');
      const before = queries;
      fail = false;
      await executor.resume(s.task.id, 'RETRY_ARCHIVE_ONLY');
      expect(queries).toBe(before);
      const completed = await s.store.task(s.task.id);
      expect(completed?.state).toBe('COMPLETED');
      const assets = await s.store.db.originalAsset.count({ where: { projectId: s.project.id } }),
        builds = await s.store.db.build.count({ where: { projectId: s.project.id } });
      await executor.resume(s.task.id, 'WAIT');
      await executor.resume(s.task.id, 'RETRY_ARCHIVE_ONLY');
      expect(await s.store.db.originalAsset.count({ where: { projectId: s.project.id } })).toBe(
        assets,
      );
      expect(await s.store.db.build.count({ where: { projectId: s.project.id } })).toBe(builds);
      expect((await s.store.taskDetail(s.task.id)).artifacts).toHaveLength(1);
      expect(await s.provider.ids()).toHaveLength(1);
      await evidence('archive-only-idempotency', {
        task: s.task.id,
        predictionId: known?.predictionId,
        queries,
        assets,
        builds,
        artifacts: completed?.artifacts,
      });
    } finally {
      await s.store.close();
    }
  });
  it('local cancellation leaves remote running; late old-snapshot success remains history', async () => {
    const s = await taskSetup();
    try {
      const executor = new Executor(
        s.store,
        { adapterFor: () => s.provider },
        new Archiver(s.store, s.provider),
      );
      await executor.resume(s.task.id, 'WAIT');
      const known = await s.store.task(s.task.id);
      await executor.requestLocalCancellation(s.task.id);
      expect((await s.store.taskDetail(s.task.id)).remoteCancellation).toBe('NOT_REQUESTED');
      expect(
        (await s.provider.query(known!.predictionId!, new AbortController().signal)).status,
      ).toBe('RUNNING');
      await s.provider.complete(known!.predictionId!);
      await executor.resume(s.task.id, 'QUERY_KNOWN_ID');
      expect((await s.store.task(s.task.id))?.state).toBe('CANCELLED_LOCAL');
      const late = await s.store.createTask(s.project.id, snapshot()),
        ex = new Executor(
          s.store,
          { adapterFor: () => s.provider },
          new Archiver(s.store, s.provider),
        );
      await ex.resume(late.id, 'WAIT');
      const remote = await s.store.task(late.id);
      await s.store.adopt(s.project.id, 1, s.b.built.ir.dependencies);
      await s.provider.complete(remote!.predictionId!);
      await ex.resume(late.id, 'QUERY_KNOWN_ID');
      expect((await s.store.task(late.id))?.state).toBe('COMPLETED');
      expect(
        (await s.store.db.project.findUniqueOrThrow({ where: { id: s.project.id } }))
          .successfulBuildId,
      ).toBeNull();
      expect(
        (await s.store.db.project.findUniqueOrThrow({ where: { id: s.project.id } })).revision,
      ).toBe(2);
    } finally {
      await s.store.close();
    }
  });
});
