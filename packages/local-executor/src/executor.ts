import { strict as assert } from 'node:assert';
import { RawSource } from '@tileset/asset-core';
import { decodeSource } from '@tileset/image-adapter';
import type {
  LocalTaskExecutor,
  TaskRecord,
  RecoveryDirective,
  AiGateway,
  RemoteResult,
  ResultArchiver,
  DurableArtifact,
} from '@tileset/ai-gateway';
import { Persistence, noFault } from '@tileset/persistence';
import type { FaultHook } from '@tileset/persistence';
export interface ResultReader {
  bytes(url: string, signal: AbortSignal): Promise<Uint8Array>;
}
/** Provider-independent validation and local archival; only accepts bytes, never provider paths. */
export class Archiver implements ResultArchiver {
  constructor(
    readonly store: Persistence,
    readonly reader: ResultReader,
    readonly fault: FaultHook = noFault,
  ) {}
  async archive(
    task: TaskRecord,
    result: Extract<RemoteResult, { status: 'SUCCEEDED' }>,
    signal: AbortSignal,
  ): Promise<readonly DurableArtifact[]> {
    assert.ok(result.outputs.length > 0 && result.outputs.length <= 8);
    const sources = [];
    for (const [ordinal, output] of result.outputs.entries()) {
      signal.throwIfAborted();
      const bytes = await this.reader.bytes(output.url, signal);
      await this.fault('archive-download');
      signal.throwIfAborted();
      const source = await decodeSource(
        new RawSource({
          id: `mock-${task.id}-${ordinal}`,
          revision: 1,
          role: 'grass',
          density: 1,
          encoding: 'png',
          bytes,
          provenance: {
            origin: 'ai',
            author: 'Synthetic Mock Provider',
            license: 'CC0-1.0',
            toolVersion: task.snapshot.model.adapterVersion,
            parents: [],
          },
        }),
      );
      signal.throwIfAborted();
      if (source.status !== 'validated') throw Error(source.diagnostic.code);
      const file = await this.store.storage.put(source.source.raw.bytes());
      sources.push({ source: source.source, file });
    }
    await this.fault('archive-files-durable');
    signal.throwIfAborted();
    signal.throwIfAborted();
    await this.store.archived(task.id, task.version, sources);
    const completed = await this.store.task(task.id);
    assert.ok(completed?.state === 'COMPLETED');
    return completed.artifacts;
  }
}
export class Executor implements LocalTaskExecutor {
  constructor(
    readonly store: Persistence,
    readonly gateway: AiGateway,
    readonly archiver: ResultArchiver,
    readonly fault: FaultHook = noFault,
  ) {}
  async enqueue(task: TaskRecord) {
    assert.ok(await this.store.task(task.id), 'Enqueue requires a persisted logical task');
    await this.resume(task.id, 'WAIT');
  }
  async resume(id: string, directive: RecoveryDirective) {
    if (directive === 'STOP_LOCAL') {
      await this.requestLocalCancellation(id);
      return;
    }
    await this.store.taskScope(id, async (lease) => {
      let task = await this.store.task(id);
      assert.ok(task);
      if (['COMPLETED', 'FAILED', 'CANCELLED_LOCAL', 'SUBMISSION_UNKNOWN'].includes(task.state))
        return;
      if (task.state === 'SUBMITTING') {
        await this.store.recoverUnknown(id, task.version);
        return;
      }
      if (task.state === 'CANCEL_REQUESTED') {
        await this.store.taskTransition(id, task.version, 'CANCELLED_LOCAL', {
          localCancelled: true,
        });
        return;
      }
      const adapter = this.gateway.adapterFor(task.snapshot);
      assert.equal(adapter.provider, 'mock');
      assert.equal(adapter.adapterVersion, task.snapshot.model.adapterVersion);
      const signal = lease.signal;
      if (task.state === 'QUEUED' || task.state === 'CREATED') {
        if (directive !== 'WAIT') return;
        const attempt = await this.store.taskIntent(id, task.version);
        await this.fault('intent-durable');
        signal.throwIfAborted();
        task = await this.store.task(id);
        assert.ok(task?.state === 'SUBMITTING');
        try {
          await lease.checkpoint();
          const submitted = await adapter.submit(task.snapshot, signal);
          await this.fault('submit-returned');
          signal.throwIfAborted();
          if (submitted.outcome === 'KNOWN') {
            assert.ok(submitted.predictionId.length > 0 && submitted.predictionId.length <= 256);
            await this.store.submissionOutcome(
              id,
              task.version,
              attempt.id,
              'KNOWN',
              submitted.predictionId,
            );
            await this.fault('external-id-durable');
            signal.throwIfAborted();
          } else
            await this.store.submissionOutcome(id, task.version, attempt.id, submitted.outcome);
        } catch {
          signal.throwIfAborted();
          const latest = await this.store.task(id);
          if (latest?.state === 'SUBMITTING') await this.store.recoverUnknown(id, latest.version);
          return;
        }
        task = await this.store.task(id);
        assert.ok(task);
        if (task.state !== 'REMOTE_RUNNING') return;
      }
      if (
        task.state === 'REMOTE_RUNNING' ||
        task.state === 'FETCHING_RESULT' ||
        task.state === 'VALIDATING_AND_INGESTING'
      ) {
        const detail = await this.store.taskDetail(id);
        if (directive === 'RETRY_ARCHIVE_ONLY' && !detail.result) return;
        let result: RemoteResult;
        if (detail.result) {
          // Persisted remote success is parsed through the provider-neutral result boundary.
          result = parseSuccess(detail.result);
        } else {
          assert.ok(task.predictionId);
          await lease.checkpoint();
          result = await adapter.query(task.predictionId, signal);
          await this.fault('remote-queried');
          signal.throwIfAborted();
          if (result.status === 'RUNNING') return;
          if (result.status === 'FAILED') {
            await this.store.taskTransition(id, task.version, 'FAILED', { errorCode: result.code });
            return;
          }
          await this.store.taskTransition(id, task.version, 'FETCHING_RESULT', {
            result,
            archiveState: 'REMOTE_SUCCEEDED',
          });
          task = await this.store.task(id);
          assert.ok(task);
        }
        assert.equal(result.status, 'SUCCEEDED');
        const success = parseSuccess(result);
        if (task.state !== 'VALIDATING_AND_INGESTING') {
          await this.store.taskTransition(id, task.version, 'VALIDATING_AND_INGESTING', {
            archiveState: 'INGESTING',
          });
          task = await this.store.task(id);
          assert.ok(task);
        }
        try {
          await lease.checkpoint();
          await this.archiver.archive(task, success, signal);
          await this.fault('local-completion-durable');
          signal.throwIfAborted();
        } catch {
          signal.throwIfAborted();
          const latest = await this.store.task(id);
          if (latest?.state === 'VALIDATING_AND_INGESTING')
            await this.store.taskTransition(id, latest.version, 'FETCHING_RESULT', {
              archiveState: 'RETRY_REQUIRED',
              errorCode: 'ARCHIVE_FAILED',
            });
        }
      }
    });
  }
  async recoverAll() {
    for (const task of await this.store.pendingTasks())
      await this.resume(
        task.id,
        task.state === 'SUBMITTING' ? 'RECONCILE_UNKNOWN_NO_RESUBMIT' : 'WAIT',
      );
  }
  async requestLocalCancellation(id: string) {
    await this.store.taskScope(id, async (lease) => {
      const task = await this.store.task(id);
      await lease.checkpoint();
      assert.ok(task);
      if (task.state === 'COMPLETED' || task.state === 'CANCELLED_LOCAL') return;
      await this.store.taskTransition(id, task.version, 'CANCELLED_LOCAL', {
        localCancelled: true,
        remoteCancellation: 'NOT_REQUESTED',
      });
    });
  }
}
function parseSuccess(value: unknown): Extract<RemoteResult, { status: 'SUCCEEDED' }> {
  assert.ok(
    value &&
      typeof value === 'object' &&
      'status' in value &&
      value.status === 'SUCCEEDED' &&
      'outputs' in value &&
      Array.isArray(value.outputs) &&
      value.outputs.length > 0 &&
      value.outputs.length <= 8,
  );
  const outputs = value.outputs.map((entry: unknown) => {
    assert.ok(
      entry &&
        typeof entry === 'object' &&
        'url' in entry &&
        typeof entry.url === 'string' &&
        entry.url.length <= 2048 &&
        'expiresAt' in entry &&
        (entry.expiresAt === null || typeof entry.expiresAt === 'string'),
    );
    return { url: entry.url, expiresAt: entry.expiresAt };
  });
  return { status: 'SUCCEEDED', outputs };
}
