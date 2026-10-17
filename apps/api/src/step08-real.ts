import { mkdir, open, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Persistence, resolveAssetRoot } from '@tileset/persistence';
import { Executor, Archiver, HttpsResultReader } from '@tileset/local-executor';
import type { ProviderAdapter } from '@tileset/ai-gateway';
import { RawSource, hashBytes } from '@tileset/asset-core';
import { decodeSource } from '@tileset/image-adapter';
import { loadEnvironment, parseConfig } from './config.js';
import { readProviderConfiguration } from './ai-provider-config.js';
import { AiTaskService } from './ai-task-service.js';
import {
  WaveSpeedAdapter,
  waveSpeedSdk,
  frozenWaveSpeedInput,
  RESULT_HOSTS,
} from './wavespeed-adapter.js';

import { readStep08Reservation, reserveStep08Submission } from './step08-budget.js';
/** Only this explicitly invoked runner opens the provider file. No automatic paid resubmission. */
export async function runStep08Real(
  providerPath: string,
  profile: { id: string; version: string },
  repairPngText = false,
): Promise<void> {
  const config = await readProviderConfiguration(providerPath);
  loadEnvironment();
  const server = parseConfig(process.env);
  // This evidence directory and DB belong to the current isolated checkout.
  const root = resolve('.local/step08/live');
  await mkdir(root, { recursive: true, mode: 0o700 });
  const lockPath = resolve(root, 'run.lock');
  const lock = await open(lockPath, 'wx', 0o600).catch((error: unknown) => {
    throw Error('LIVE_RUN_LOCKED', { cause: error });
  });
  let store: Persistence | undefined;
  try {
    store = new Persistence(server.DATABASE_URL, await resolveAssetRoot(process.env), profile);
    const service = new AiTaskService(store, profile);
    const records = await Promise.all(
      (['generate', 'edit'] as const).map((kind) => readStep08Reservation(root, kind)),
    );
    for (const record of records)
      if (record) {
        const task = await store.task(record.taskId);
        if (!task || task.state === 'SUBMITTING' || task.state === 'SUBMISSION_UNKNOWN')
          throw Error('SUBMISSION_UNKNOWN_NO_NEW_PAID_REQUESTS');
        if (record.reservedUsd < 0 || !Number.isFinite(record.reservedUsd))
          throw Error('LIVE_RECORD_INVALID');
      }
    let reserved = records.reduce((total, entry) => total + (entry?.reservedUsd ?? 0), 0);
    if (reserved > config.budgetUsd) throw Error('BUDGET_BELOW_EXISTING_RESERVATIONS');
    const projectPath = resolve(root, 'project.json');
    let projectId: string;
    try {
      projectId = (JSON.parse(await readFile(projectPath, 'utf8')) as { projectId: string })
        .projectId;
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw Error('LIVE_PROJECT_INVALID', { cause: error });
      projectId = (await store.createProject('Step08 bounded real integration')).id;
      await writeFile(projectPath, JSON.stringify({ projectId }), { flag: 'wx', mode: 0o600 });
    }
    await store.projectSnapshot(projectId);
    // A controlled upload goes through the identical owned PNG decoder/storage boundary; no user server path.
    const referencePath = resolve(root, 'reference.json');
    let referenceId: string;
    try {
      referenceId = (JSON.parse(await readFile(referencePath, 'utf8')) as { referenceId: string })
        .referenceId;
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw Error('LIVE_REFERENCE_INVALID', { cause: error });
      const bytes = new Uint8Array(await readFile(resolve('tests/fixtures/art-ground.png')));
      const result = await decodeSource(
        new RawSource({
          id: 'step08-reference',
          revision: 1,
          role: 'grass',
          density: 1,
          encoding: 'png',
          bytes,
          provenance: {
            origin: 'manual',
            author: 'AI Tileset Studio original fixture',
            license: 'CC0-1.0',
            toolVersion: 'step08-reference-v1',
            parents: [],
          },
        }),
      );
      if (result.status !== 'validated') throw Error('LIVE_REFERENCE_REJECTED', { cause: error });
      referenceId = await store.saveSource(projectId, result.source);
      await writeFile(referencePath, JSON.stringify({ referenceId }), { flag: 'wx', mode: 0o600 });
    }
    const uploadRoot = resolve(root, 'uploads');
    await mkdir(uploadRoot, { recursive: true, mode: 0o700 });
    const adapter = new WaveSpeedAdapter(
      config.key,
      waveSpeedSdk(config.key),
      uploadRoot,
      (reference, signal) => service.referenceBytes(projectId, reference, signal),
    );
    const results = [];
    for (const [ordinal, kind] of (['generate', 'edit'] as const).entries()) {
      const old = records[ordinal];
      // Task identity is fixed on disk before running. An unacknowledged submit can never create another task on rerun.
      const taskPath = resolve(root, `${kind}-task.json`);
      let taskId: string;
      try {
        taskId = (JSON.parse(await readFile(taskPath, 'utf8')) as { taskId: string }).taskId;
      } catch (error) {
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
          throw Error('LIVE_TASK_INVALID', { cause: error });
        const created = await service.create(
          projectId,
          {
            operation: ordinal === 0 ? 'IMAGE_GENERATE' : 'IMAGE_EDIT',
            component: 'grass',
            supplemental: ordinal === 0 ? '' : '柔和的浅绿色',
          },
          ordinal === 0 ? undefined : referenceId,
        );
        taskId = created.id;
        await writeFile(taskPath, JSON.stringify({ taskId }), { flag: 'wx', mode: 0o600 });
      }
      let price: number | null = old?.quotedUsd ?? null;
      const guarded: ProviderAdapter = {
        provider: adapter.provider,
        adapterVersion: adapter.adapterVersion,
        query: adapter.query.bind(adapter),
        submit: async (snapshot, signal) => {
          if (old || (await readStep08Reservation(root, kind)))
            return { outcome: 'UNKNOWN', reason: 'AMBIGUOUS_RESPONSE' };
          try {
            const input = frozenWaveSpeedInput(snapshot);
            if (snapshot.taskKind === 'IMAGE_EDIT')
              input['image'] = await adapter.uploadReference(snapshot.references[0]!, signal);
            price = await adapter.quote(snapshot, input, signal);
            const reservation = await reserveStep08Submission(
              root,
              kind,
              taskId,
              snapshot.model.modelId,
              price,
              config.budgetUsd,
            );
            reserved += reservation.reservedUsd;
            return adapter.submitPrepared(snapshot, input, signal);
          } catch (error) {
            return {
              outcome: 'REJECTED',
              code:
                error instanceof Error && /^[A-Z0-9_]{1,100}$/.test(error.message)
                  ? error.message
                  : 'LIVE_PREFLIGHT_BLOCKED',
            };
          }
        },
      };
      const executor = new Executor(
        store,
        { adapterFor: () => guarded },
        new Archiver(store, new HttpsResultReader(RESULT_HOSTS), undefined, repairPngText),
      );
      // One operation at a time, bounded polling; no timer or normal server startup runs this command.
      const deadline = performance.now() + 180000;
      while (true) {
        await executor.resume(taskId, 'WAIT');
        const state = await store.task(taskId);
        if (!state) throw Error('LIVE_TASK_MISSING');
        console.log(
          JSON.stringify({ kind, taskId, state: state.state, predictionId: state.predictionId }),
        );
        if (
          ['COMPLETED', 'FAILED', 'SUBMISSION_UNKNOWN', 'CANCELLED_LOCAL'].includes(state.state) ||
          (await store.taskDetail(taskId)).archiveState === 'RETRY_REQUIRED' ||
          performance.now() >= deadline
        )
          break;
        await delay(2000);
      }
      const detail = await store.taskDetail(taskId);
      results.push({
        kind,
        taskId,
        predictionId: detail.predictionId,
        state: detail.state,
        archiveState: detail.archiveState,
        errorCode: detail.errorCode,
        snapshotHash: detail.snapshotHash,
        model: (await store.task(taskId))!.snapshot.model.modelId,
        promptRevision: 'terrain-source-main@1',
        quotedUsd: price,
        reservedUsd: (await readStep08Reservation(root, kind))?.reservedUsd ?? 0,
        actualChargedUsd: 'UNVERIFIED_NOT_RETURNED',
        artifacts: detail.artifacts.map((artifact) => ({
          sha256: artifact.sha256,
          sourceRef: artifact.sourceRef,
        })),
      });
      await writeFile(
        resolve(root, 'result.json'),
        JSON.stringify(
          {
            sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
            budgetUsd: config.budgetUsd,
            reservedUsd: reserved,
            paidSubmissionLimit: 2,
            concurrency: 1,
            metadataRepair: repairPngText ? 'png-text-drop-v1' : 'NOT_REQUESTED',
            providerFile: 'USER_PRIVATE_FILE_NOT_COPIED',
            referenceSha256: hashBytes((await store.readSource(referenceId)).raw.bytes()),
            results,
          },
          null,
          2,
        ),
        { mode: 0o600 },
      );
      if (detail.state !== 'COMPLETED') throw Error('LIVE_CHAIN_INCOMPLETE_NO_NEW_PAID_REQUESTS');
    }
  } finally {
    await store?.close();
    await lock.close();
    await unlink(lockPath);
  }
}
