import { mkdir, open, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Persistence, resolveAssetRoot } from '@tileset/persistence';
import { Executor, Archiver, HttpsResultReader } from '@tileset/local-executor';
import type { ProviderAdapter } from '@tileset/ai-gateway';
import { hashBytes } from '@tileset/asset-core';
import { loadEnvironment, parseConfig } from './config.js';
import { readProviderConfiguration } from './ai-provider-config.js';
import { AiTaskService } from './ai-task-service.js';
import { WaveSpeedAdapter, waveSpeedSdk, RESULT_HOSTS } from './wavespeed-adapter.js';
import {
  STEP08_SUBMISSION_KINDS,
  readStep08Reservation,
  reserveStep08Submission,
} from './step08-budget.js';

/** User-authorized one additional Edit; never resumes or submits Generate/the old failed Edit. */
export async function runStep08AdditionalEdit(
  providerPath: string,
  profile: { id: string; version: string },
  repairPngText: boolean,
): Promise<void> {
  const configuration = await readProviderConfiguration(providerPath);
  loadEnvironment();
  const server = parseConfig(process.env),
    root = resolve('.local/step08/live');
  const lockPath = resolve(root, 'run.lock'),
    lock = await open(lockPath, 'wx', 0o600);
  let store: Persistence | undefined;
  try {
    store = new Persistence(server.DATABASE_URL, await resolveAssetRoot(process.env), profile);
    const records = await Promise.all(
      STEP08_SUBMISSION_KINDS.map((kind) => readStep08Reservation(root, kind)),
    );
    const generate = records[0],
      previousEdit = records[1];
    if (!generate || !previousEdit) throw Error('ADDITIONAL_EDIT_REQUIRES_PRIOR_RECORDS');
    const previous = await Promise.all([
      store.taskDetail(generate.taskId),
      store.taskDetail(previousEdit.taskId),
    ]);
    if (
      previous[0]!.state !== 'COMPLETED' ||
      previous[1]!.state !== 'FETCHING_RESULT' ||
      previous[1]!.archiveState !== 'RETRY_REQUIRED' ||
      !previous[1]!.predictionId
    )
      throw Error('ADDITIONAL_EDIT_PRIOR_STATE_UNVERIFIED');
    for (const record of records)
      if (record) {
        const task = await store.task(record.taskId);
        if (!task || task.state === 'SUBMITTING' || task.state === 'SUBMISSION_UNKNOWN')
          throw Error('SUBMISSION_UNKNOWN_NO_NEW_PAID_REQUESTS');
      }
    const before = previous.map((row) => ({
      taskId: row.id,
      snapshotHash: row.snapshotHash,
      detailSha256: hashBytes(Buffer.from(JSON.stringify(row))),
    }));
    const reservedBefore = records.reduce((total, record) => total + (record?.reservedUsd ?? 0), 0);
    if (reservedBefore > configuration.budgetUsd) throw Error('BUDGET_BELOW_EXISTING_RESERVATIONS');
    const { projectId } = JSON.parse(await readFile(resolve(root, 'project.json'), 'utf8')) as {
      projectId: string;
    };
    const { referenceId } = JSON.parse(await readFile(resolve(root, 'reference.json'), 'utf8')) as {
      referenceId: string;
    };
    if (previous.some((row) => row.projectId !== projectId))
      throw Error('ADDITIONAL_EDIT_PROJECT_MISMATCH');
    const service = new AiTaskService(store, profile),
      taskPath = resolve(root, 'edit-size-fix-task.json');
    let taskId: string;
    try {
      taskId = (JSON.parse(await readFile(taskPath, 'utf8')) as { taskId: string }).taskId;
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw Error('LIVE_TASK_INVALID', { cause: error });
      if (records[2]) throw Error('ADDITIONAL_EDIT_TASK_RECORD_MISSING', { cause: error });
      const created = await service.create(
        projectId,
        { operation: 'IMAGE_EDIT', component: 'grass', supplemental: '柔和的浅绿色' },
        referenceId,
      );
      taskId = created.id;
      const file = await open(taskPath, 'wx', 0o600);
      try {
        await file.writeFile(JSON.stringify({ taskId }));
        await file.sync();
      } finally {
        await file.close();
      }
    }
    if (records[2] && records[2].taskId !== taskId) throw Error('ADDITIONAL_EDIT_TASK_MISMATCH');
    const newTask = await store.task(taskId);
    if (
      !newTask ||
      newTask.projectId !== projectId ||
      newTask.snapshot.taskKind !== 'IMAGE_EDIT' ||
      newTask.snapshot.structuredParameters['referencePreparation'] !==
        'match-output-nearest-explicit-v1'
    )
      throw Error('ADDITIONAL_EDIT_SNAPSHOT_INVALID');
    const oldTask = await store.task(previousEdit.taskId),
      original = newTask.snapshot.references[0];
    if (
      !oldTask ||
      !original ||
      original.assetId !== oldTask.snapshot.references[0]?.assetId ||
      original.revision !== oldTask.snapshot.references[0]?.revision ||
      original.sha256 !== oldTask.snapshot.references[0]?.sha256
    )
      throw Error('ADDITIONAL_EDIT_REFERENCE_MISMATCH');
    const uploadRoot = resolve(root, 'uploads');
    await mkdir(uploadRoot, { recursive: true, mode: 0o700 });
    const adapter = new WaveSpeedAdapter(
      configuration.key,
      waveSpeedSdk(configuration.key),
      uploadRoot,
      (reference, signal) => service.referenceBytes(projectId, reference, signal),
    );
    let quotedUsd: number | null = records[2]?.quotedUsd ?? null;
    const guarded: ProviderAdapter = {
      provider: adapter.provider,
      adapterVersion: adapter.adapterVersion,
      query: adapter.query.bind(adapter),
      submit: async (snapshot, signal) => {
        if (await readStep08Reservation(root, 'edit-size-fix'))
          return { outcome: 'UNKNOWN', reason: 'AMBIGUOUS_RESPONSE' };
        try {
          const input = await adapter.prepareInput(snapshot, signal);
          quotedUsd = await adapter.quote(snapshot, input, signal);
          await writeFile(
            resolve(root, 'edit-size-fix-request.json'),
            JSON.stringify(
              {
                taskId,
                model: snapshot.model.modelId,
                parameters: snapshot.model.parameters,
                configurationVersion: snapshot.configurationVersion,
                referencePreparation: snapshot.structuredParameters['referencePreparation'],
                references: snapshot.references,
                inputSha256: hashBytes(Buffer.from(JSON.stringify(input))),
                uploadedHost: new URL(String(input['image'])).hostname,
                quotedUsd,
              },
              null,
              2,
            ),
            { flag: 'wx', mode: 0o600 },
          );
          await reserveStep08Submission(
            root,
            'edit-size-fix',
            taskId,
            snapshot.model.modelId,
            quotedUsd,
            configuration.budgetUsd,
          );
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
    const deadline = performance.now() + 180000;
    while (true) {
      await executor.resume(taskId, 'WAIT');
      const state = await store.task(taskId);
      if (!state) throw Error('LIVE_TASK_MISSING');
      console.log(
        JSON.stringify({
          kind: 'edit-size-fix',
          taskId,
          state: state.state,
          predictionId: state.predictionId,
        }),
      );
      if (
        ['COMPLETED', 'FAILED', 'SUBMISSION_UNKNOWN', 'CANCELLED_LOCAL'].includes(state.state) ||
        (await store.taskDetail(taskId)).archiveState === 'RETRY_REQUIRED' ||
        performance.now() >= deadline
      )
        break;
      await delay(2000);
    }
    const detail = await store.taskDetail(taskId),
      after = await Promise.all(before.map((record) => store!.taskDetail(record.taskId)));
    const priorTasksUnchanged = before.every(
      (record, index) =>
        record.detailSha256 === hashBytes(Buffer.from(JSON.stringify(after[index]))),
    );
    const finalReservations = await Promise.all(
      STEP08_SUBMISSION_KINDS.map((kind) => readStep08Reservation(root, kind)),
    );
    await writeFile(
      resolve(root, 'edit-size-fix-result.json'),
      JSON.stringify(
        {
          sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
          authorization: 'USER_20261017_ONE_ADDITIONAL_EDIT',
          budgetUsd: configuration.budgetUsd,
          reservedUsd: finalReservations.reduce(
            (total, record) => total + (record?.reservedUsd ?? 0),
            0,
          ),
          modelSubmissions: finalReservations.filter(Boolean).length,
          additionalEditLimit: 1,
          concurrency: 1,
          before,
          priorTasksUnchanged,
          taskId,
          predictionId: detail.predictionId,
          state: detail.state,
          archiveState: detail.archiveState,
          snapshotHash: detail.snapshotHash,
          snapshot: newTask.snapshot,
          quotedUsd,
          actualChargedUsd: 'UNVERIFIED',
          artifacts: detail.artifacts,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    if (!priorTasksUnchanged) throw Error('PRIOR_TASK_INTEGRITY_FAILED');
    if (detail.state !== 'COMPLETED') throw Error('LIVE_CHAIN_INCOMPLETE_NO_NEW_PAID_REQUESTS');
  } finally {
    await store?.close();
    await lock.close();
    await unlink(lockPath);
  }
}
