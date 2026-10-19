import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DEFAULT_MODELS } from '@tileset/ai-gateway';
import type { DefaultModelConfiguration, ProviderAdapter } from '@tileset/ai-gateway';
import { RawSource, RgbaImage, fingerprint, hashBytes } from '@tileset/asset-core';
import { decodeSource, encodePng, inspectPng } from '@tileset/image-adapter';
import {
  normalizeAiRegion,
  sampleRegion,
  sharedPalette,
  defaultTerrainRegion,
  AI_REGION_CONVERSION,
  blank,
} from '@tileset/material-processing';
import { Archiver, Executor, HttpsResultReader, MockProvider } from '@tileset/local-executor';
import { dbJson } from '@tileset/persistence';
import { AiStateSchema } from '@tileset/contracts';
import type { AiCreateSchema, AiApplySchema } from '@tileset/contracts';
import type { z } from 'zod';
import { AiTaskService } from './ai-task-service.js';
import { StudioService } from './studio-service.js';
import { StudioError } from './studio-errors.js';
import { repositoryRoot } from './config.js';
import { loadProviderCredentials } from './ai-provider-config.js';
import { WaveSpeedAdapter, waveSpeedSdk, RESULT_HOSTS } from './wavespeed-adapter.js';
import {
  sharedStep09BudgetRoot,
  assertStep09Approved,
  reserveStep09,
  recordStep09,
  stopStep09Scope,
  EXPLORATION,
} from './step09-budget.js';
export const STUDIO_AI_VERSION = 'step09-ai-studio-v1';
export const STEP09_MODELS: DefaultModelConfiguration = Object.freeze({
  ...DEFAULT_MODELS,
  configurationVersion: 'terrain-models-step09-functional-v2',
  imageEditPrompt: 'reference-role-material-v2',
  imageEdit: {
    ...DEFAULT_MODELS.imageEdit,
    parameters: { ...DEFAULT_MODELS.imageEdit.parameters, strength: 0.9 },
  },
  imageEditReferencePreparation: 'center-crop-square-nearest-v2',
});
const mockModel = {
  provider: 'mock',
  modelId: 'synthetic-terrain',
  modelVersion: '1',
  adapterVersion: 'mock-provider-v1',
  parameters: { size: '256*256' },
} as const;
const MOCK_DEFAULTS: DefaultModelConfiguration = {
  ...STEP09_MODELS,
  configurationVersion: 'terrain-models-step09-mock-v2',
  imageGenerate: mockModel,
  imageEdit: mockModel,
};
function aiError(code: string, message: string, recovery: string, status = 422) {
  return new StudioError({ code, message, recovery, location: 'AI 创作' }, status);
}
export class AiStudioService {
  readonly mode: 'mock' | 'wavespeed' | 'disabled';
  readonly budgetRoot: string;
  private timer: ReturnType<typeof setInterval> | undefined;
  private active: Promise<void> | undefined;
  private stopped = false;
  private executing = false;
  constructor(
    readonly studio: StudioService,
    readonly env: NodeJS.ProcessEnv = process.env,
  ) {
    const mode = env['TILESET_AI_MODE'] ?? 'mock';
    if (!['mock', 'wavespeed', 'disabled'].includes(mode)) throw Error('AI_MODE_INVALID');
    this.mode = mode as typeof this.mode;
    this.budgetRoot = sharedStep09BudgetRoot(repositoryRoot);
  }
  start() {
    if (this.mode !== 'disabled')
      this.timer = setInterval(() => {
        if (!this.active && !this.stopped)
          this.active = this.tick()
            .catch(() => {})
            .finally(() => {
              this.active = undefined;
            });
      }, 1000);
  }
  async close() {
    this.stopped = true;
    clearInterval(this.timer);
    await this.active;
  }
  private service() {
    return new AiTaskService(
      this.studio.store,
      this.studio.resources.profile as { id: string; version: string },
      this.mode === 'mock' ? MOCK_DEFAULTS : STEP09_MODELS,
    );
  }
  async create(projectId: string, input: z.infer<typeof AiCreateSchema>) {
    if (this.mode === 'disabled')
      throw aiError('AI_DISABLED', 'AI 创作尚未启用。', '在后端配置 Mock 或获批的 Provider。');
    if (this.mode === 'wavespeed')
      await assertStep09Approved(this.budgetRoot, 'step09-functional-reference-v2').catch(() => {
        throw aiError(
          'BUDGET_NOT_APPROVED',
          '步骤09真实调用预算尚未批准。',
          '请先由用户批准固定探索清单；密钥不代表预算授权。',
          409,
        );
      });
    if (this.mode === 'wavespeed') {
      if (
        !input.referenceId ||
        input.repair ||
        input.supplemental !== '' ||
        input.style !== 'temperate-pixel'
      )
        throw aiError(
          'EXPLORATION_INPUT',
          '本批次未授权该输入；固定探索使用空辅助与默认风格。',
          '合法辅助偏好仍可使用Mock；真实调用需用户将该输入纳入预算批准。',
          409,
        );
      if (input.referenceId) {
        const row = await this.studio.sourceRow(projectId, input.referenceId);
        if (row.sourceSha !== EXPLORATION.referenceSha256)
          throw aiError(
            'EXPLORATION_REFERENCE',
            '当前探索参考SHA不匹配。',
            '使用固定探索清单中的参考原图。',
            409,
          );
      }
      await loadProviderCredentials(this.env, repositoryRoot).catch(() => {
        throw aiError(
          'PROVIDER_CONFIGURATION_UNAVAILABLE',
          '后端Provider凭据未正确配置。',
          '设置共享Provider文件路径或显式进程配置，不要把密钥放进前端。',
          409,
        );
      });
    }
    return this.studio.exclusive(() =>
      this.studio.store.gate.write(async () => {
        const state = await this.studio.state(projectId);
        if (state.revision !== input.expectedRevision) throw Error('Project revision conflict');
        if ((await this.list(projectId)).candidates.length >= 60)
          throw aiError(
            'AI_HISTORY_LIMIT',
            '本项目已达到60个候选任务上限。',
            '保留历史，在新项目继续。',
          );
        const current = state.recipes.find((r) => r.current);
        if (input.repair && !current)
          throw aiError(
            'REPAIR_REQUIRES_RECIPE',
            '局部修复需要已采用的配方。',
            '先选择完整候选并构建。',
          );
        const batch = randomUUID(),
          caseId = input.referenceId ? 'R01' : 'T01';
        const prior = (await this.list(projectId)).candidates.some(
          (c) =>
            c.mode === (input.referenceId ? 'reference' : 'text') &&
            c.configurationVersion ===
              (this.mode === 'mock' ? MOCK_DEFAULTS : STEP09_MODELS).configurationVersion,
        );
        const purpose = input.repair ? 'repair' : prior ? 'retry' : 'initial';
        const context = {
          studioVersion: STUDIO_AI_VERSION,
          batch,
          caseId,
          purpose,
          baseComponents: JSON.stringify(input.repair ? current!.components : {}),
          conversion: AI_REGION_CONVERSION.version,
          authorizationScope: 'step09-functional-reference-v2',
        };
        const tasks = [];
        for (const component of (input.repair ? [input.repair] : ['grass', 'water']) as (
          'grass' | 'water'
        )[]) {
          tasks.push(
            await this.service().create(
              projectId,
              {
                operation: input.referenceId ? 'IMAGE_EDIT' : 'IMAGE_GENERATE',
                component,
                supplemental: input.supplemental,
                style: input.style,
              },
              input.referenceId,
              context,
            ),
          );
        }
        return { taskIds: tasks.map((t) => t.id) };
      }),
    );
  }
  async reference(projectId: string, bytes: Uint8Array, signal: AbortSignal) {
    await this.studio.project(projectId);
    const inventory = await this.studio.store.db.assetRevision.findMany({
      where: { projectId, kind: 'source' },
      include: { source: true },
    });
    if (
      inventory.length >= 768 ||
      inventory.reduce((n, r) => n + (r.source?.bytes ?? 0), 0) + bytes.length > 32 * 1024 * 1024
    )
      throw aiError('SOURCE_BUDGET', '项目源归档已达到上限。', '历史保留，在新项目继续。', 413);
    const result = await decodeSource(
      new RawSource({
        id: `ai-reference-${hashBytes(bytes).slice(0, 48)}`,
        revision: 1,
        role: 'grass',
        density: 1,
        encoding: 'png',
        bytes,
        provenance: {
          origin: 'manual',
          author: 'Studio reference upload',
          license: 'User supplied',
          toolVersion: 'reference-original-v1',
          parents: [],
        },
      }),
      signal,
    );
    if (result.status !== 'validated')
      throw aiError(
        result.diagnostic.code,
        '参考图未通过PNG硬校验。',
        '上传RGBA8/sRGB单图PNG，≤4MiB/预算内像素。',
      );
    const id = await this.studio.store.saveSource(projectId, result.source, signal);
    return {
      id,
      sha256: result.source.raw.encodedHash,
      width: result.source.image.width,
      height: result.source.image.height,
      preparation: 'center-crop-square-nearest-v2' as const,
    };
  }
  private async task(projectId: string, id: string) {
    const task = await this.studio.store.task(id);
    assert.ok(
      task?.projectId === projectId &&
        task.snapshot.structuredParameters['studioVersion'] === STUDIO_AI_VERSION,
    );
    return task;
  }
  async list(projectId: string) {
    await this.studio.project(projectId);
    const tasks = await this.studio.store.db.logicalTask.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { artifacts: true },
    });
    const candidates = [];
    for (const row of tasks) {
      const task = await this.studio.store.task(row.id);
      if (task?.snapshot.structuredParameters['studioVersion'] !== STUDIO_AI_VERSION) continue;
      const p = task.snapshot.structuredParameters,
        a = row.artifacts[0];
      const source = a
        ? await this.studio.store.db.assetRevision.findFirst({
            where: {
              projectId,
              assetId: a.assetId,
              revision: Number(a.revision),
              sourceSha: a.sha256,
              kind: 'source',
            },
          })
        : null;
      const dimensions = source?.sourceSha
        ? inspectPng(
            await this.studio.store.storage.read(
              await this.studio.store.db.fileObject.findUniqueOrThrow({
                where: { sha256: source.sourceSha },
              }),
            ),
          )
        : null;
      candidates.push({
        id: row.id,
        component: p['component'],
        batch: p['batch'],
        configurationVersion: task.snapshot.configurationVersion,
        mode: task.snapshot.taskKind === 'IMAGE_EDIT' ? 'reference' : 'text',
        purpose: p['purpose'],
        state: row.state,
        archiveState: row.archiveState,
        errorCode: row.errorCode,
        createdAt: row.createdAt.toISOString(),
        sha256: a?.sha256 ?? null,
        sourceId: source?.id ?? null,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        url: source ? `/api/projects/${projectId}/sources/${source.id}/png` : null,
        discarded: row.errorCode === 'CANDIDATE_DISCARDED',
        recovery:
          row.state === 'SUBMISSION_UNKNOWN'
            ? '提交结果未知；禁止自动重提，需人工核对。'
            : row.archiveState === 'RETRY_REQUIRED'
              ? '远端已成功；仅恢复归档，不再购买。'
              : row.state === 'FAILED'
                ? '失败历史保留；本轮真实补测不重试。预算/批次被阻止时需用户核对，不能自动追加。'
                : '候选归档不代表Pack成功；选择后转换、编译与QA。',
      });
    }
    return AiStateSchema.parse({
      mode: this.mode,
      candidates,
      limits:
        'Mock为合成素材，不计真实成功率。真实调用仅限用户批准的09固定批次；并发1/最多10提交。原图保留；中心裁切会丢失边缘，像素化会减少细节，不能保证参考保真。',
    });
  }
  async action(projectId: string, id: string, action: 'resume' | 'cancel' | 'discard') {
    const task = await this.task(projectId, id);
    if (action === 'resume') {
      if (task.state === 'SUBMISSION_UNKNOWN')
        throw aiError(
          'SUBMISSION_UNKNOWN',
          '提交状态未知。',
          '只核对原供应商记录；不自动重提。',
          409,
        );
      await this.runTask(id);
      return;
    }
    if (action === 'cancel') {
      await new Executor(
        this.studio.store,
        {
          adapterFor: () => {
            throw Error('NO_SUBMISSION');
          },
        },
        { archive: async () => [] },
      ).requestLocalCancellation(id);
      if (task.snapshot.model.provider === 'wavespeed' && task.predictionId)
        await recordStep09(this.budgetRoot, id, 'CANCELLED');
      return;
    }
    if (task.state !== 'COMPLETED')
      throw aiError(
        'CANDIDATE_NOT_COMPLETE',
        '只能丢弃已归档候选。',
        '运行中的任务请本地取消；原失败诊断保持。',
      );
    await this.studio.store.gate.write(async (lease) => {
      await this.studio.store.db.$transaction(async (tx) => {
        await lease.fence(tx);
        const changed = await tx.logicalTask.updateMany({
          where: { id, version: task.version },
          data: { errorCode: 'CANDIDATE_DISCARDED', version: { increment: 1 } },
        });
        assert.equal(changed.count, 1, 'Task decision CAS conflict');
      });
    });
    if (task.snapshot.model.provider === 'wavespeed')
      await recordStep09(this.budgetRoot, id, 'DISCARDED');
  }
  async tick() {
    const tasks = (await this.studio.store.pendingTasks()).sort((a, b) => {
      const active = (s: string) => (['QUEUED', 'CREATED'].includes(s) ? 1 : 0);
      return active(a.state) - active(b.state) || a.createdAt.getTime() - b.createdAt.getTime();
    });
    for (const row of tasks) {
      if (this.stopped) break;
      const task = await this.studio.store.task(row.id);
      if (
        task?.snapshot.structuredParameters['studioVersion'] === STUDIO_AI_VERSION &&
        task.state !== 'SUBMISSION_UNKNOWN' &&
        row.archiveState !== 'RETRY_REQUIRED'
      ) {
        if (
          Date.now() - row.createdAt.getTime() > 180000 &&
          ['REMOTE_RUNNING', 'SUBMITTING', 'FETCHING_RESULT', 'VALIDATING_AND_INGESTING'].includes(
            row.state,
          )
        )
          return;
        await this.runTask(row.id);
        break;
      }
    }
  }
  private async runTask(id: string) {
    if (this.executing) throw aiError('AI_BUSY', '已有AI任务正在处理。', '稍后恢复原任务。', 429);
    this.executing = true;
    try {
      await this.executeTask(id);
    } catch (cause) {
      if (cause instanceof Error && cause.message === 'STEP09_BUDGET_NOT_APPROVED') {
        await this.studio.store.gate.write(async (lease) => {
          await this.studio.store.db.$transaction(async (tx) => {
            await lease.fence(tx);
            const task = await this.studio.store.task(id);
            if (task)
              await tx.logicalTask.updateMany({
                where: { id, version: task.version, state: { in: ['CREATED', 'QUEUED'] } },
                data: { state: 'FAILED', errorCode: 'AI_BATCH_BLOCKED', version: { increment: 1 } },
              });
          });
        });
      } else throw cause;
    } finally {
      this.executing = false;
    }
  }
  private async executeTask(id: string) {
    const task = await this.studio.store.task(id);
    assert.ok(task);
    const p = task.snapshot.structuredParameters;
    let adapter: ProviderAdapter, reader: import('@tileset/local-executor').ResultReader;
    if (task.snapshot.model.provider === 'mock') {
      const bytes = await syntheticCandidate(p['component'] === 'water' ? 'water' : 'grass');
      const mock = new MockProvider(
        resolve(this.studio.store.storage.root, 'step09-mock-remote'),
        bytes,
      );
      adapter = {
        provider: 'mock',
        adapterVersion: mock.adapterVersion,
        submit: async (s, signal) => {
          const result = await mock.submit(s, signal);
          if (result.outcome === 'KNOWN') await mock.complete(result.predictionId);
          return result;
        },
        query: mock.query.bind(mock),
      };
      reader = mock;
    } else {
      await assertStep09Approved(
        this.budgetRoot,
        task.snapshot.configurationVersion === STEP09_MODELS.configurationVersion &&
          ['CREATED', 'QUEUED'].includes(task.state)
          ? 'step09-functional-reference-v2'
          : undefined,
      );
      if (task.snapshot.configurationVersion === STEP09_MODELS.configurationVersion) {
        assert.equal(task.snapshot.taskKind, 'IMAGE_EDIT');
        assert.deepEqual(task.snapshot.model, STEP09_MODELS.imageEdit);
        assert.equal(task.snapshot.prompts.task.id, 'terrain-reference-role-material');
        assert.equal(task.snapshot.prompts.task.revision, '2');
        assert.equal(task.snapshot.references[0]?.sha256, EXPLORATION.referenceSha256);
        assert.equal(task.snapshot.prompts.supplemental, '');
        assert.equal(task.snapshot.style.id, 'temperate-pixel');
        assert.equal(p['authorizationScope'], 'step09-functional-reference-v2');
      }
      const { key } = await loadProviderCredentials(this.env, repositoryRoot);
      const uploadRoot = resolve(this.studio.store.storage.root, 'provider-upload');
      await mkdir(uploadRoot, { recursive: true, mode: 0o700 });
      const real = new WaveSpeedAdapter(key, waveSpeedSdk(key), uploadRoot, (reference, signal) =>
        this.service().referenceBytes(task.projectId, reference, signal),
      );
      adapter = {
        provider: real.provider,
        adapterVersion: real.adapterVersion,
        query: async (predictionId, signal) => {
          const result = await real.query(predictionId, signal);
          if (result.status !== 'RUNNING')
            await recordStep09(
              this.budgetRoot,
              id,
              result.status === 'SUCCEEDED' ? 'REMOTE_SUCCEEDED' : 'REMOTE_FAILED',
            );
          return result;
        },
        submit: async (snapshot, signal) => {
          try {
            const input = await real.prepareInput(snapshot, signal),
              price = await real.quote(snapshot, input, signal);
            await reserveStep09(
              this.budgetRoot,
              {
                taskId: id,
                caseId: p['caseId'] as 'T01' | 'R01',
                purpose: p['purpose'] as 'initial' | 'retry' | 'repair',
                component: p['component'] as 'grass' | 'water',
                quotedUsd: price,
                ...(snapshot.configurationVersion === STEP09_MODELS.configurationVersion
                  ? {
                      scope: 'step09-functional-reference-v2' as const,
                      snapshotHash: fingerprint(snapshot),
                    }
                  : {}),
              },
              snapshot.model.modelId,
            );
            const result = await real.submitPrepared(snapshot, input, signal);
            await recordStep09(
              this.budgetRoot,
              id,
              result.outcome === 'KNOWN'
                ? 'KNOWN'
                : result.outcome === 'UNKNOWN'
                  ? 'UNKNOWN'
                  : 'REJECTED',
            );
            return result;
          } catch {
            if (snapshot.configurationVersion === STEP09_MODELS.configurationVersion)
              await stopStep09Scope(this.budgetRoot, id);
            return { outcome: 'REJECTED', code: 'STEP09_PREFLIGHT_BLOCKED' };
          }
        },
      };
      reader = new HttpsResultReader(RESULT_HOSTS);
    }
    const executor = new Executor(
      this.studio.store,
      { adapterFor: () => adapter },
      new Archiver(this.studio.store, reader, undefined, true),
    );
    const detail = await this.studio.store.taskDetail(id);
    // A persisted successful remote result also proves terminality after a
    // restart; archive-only recovery must never purchase another generation.
    if (detail.result && task.snapshot.model.provider === 'wavespeed')
      await recordStep09(this.budgetRoot, id, 'REMOTE_SUCCEEDED');
    const archiveRetry = detail.archiveState === 'RETRY_REQUIRED';
    if (archiveRetry && task.snapshot.model.provider === 'wavespeed')
      await recordStep09(this.budgetRoot, id, 'ARCHIVE_RETRY');
    await executor.resume(id, archiveRetry ? 'RETRY_ARCHIVE_ONLY' : 'WAIT');
    const next = await this.studio.store.task(id);
    if (task.snapshot.model.provider === 'wavespeed') {
      if (next?.state === 'COMPLETED') await recordStep09(this.budgetRoot, id, 'ARCHIVED');
      else if ((await this.studio.store.taskDetail(id)).archiveState === 'RETRY_REQUIRED')
        await recordStep09(this.budgetRoot, id, 'ARCHIVE_FAILED');
      else if (next?.state === 'FAILED')
        await recordStep09(this.budgetRoot, id, 'FAILED').catch(() => {});
      else if (next?.state === 'SUBMISSION_UNKNOWN')
        await recordStep09(this.budgetRoot, id, 'UNKNOWN').catch(() => {});
    }
  }
  async apply(projectId: string, input: z.infer<typeof AiApplySchema>, signal: AbortSignal) {
    const saved = await this.studio.exclusive(() =>
      this.studio.store.gate.write(async () => {
        const state = await this.studio.state(projectId);
        if (state.revision !== input.expectedRevision) throw Error('Project revision conflict');
        const current = state.recipes.find((r) => r.current);
        if (!current && (!input.grassTask || !input.waterTask))
          throw aiError(
            'COMPLETE_PAIR_REQUIRED',
            '首次创作需要同时选择草地与水面基础。',
            '分别选择两个已归档候选后构建完整Pack。',
          );
        const sources = { ...current?.components } as Record<string, string>;
        const selected = [];
        for (const [component, id] of [
          ['grass', input.grassTask],
          ['water', input.waterTask],
        ] as const) {
          if (!id) continue;
          const task = await this.task(projectId, id),
            detail = await this.studio.store.taskDetail(id);
          assert.ok(
            task.state === 'COMPLETED' &&
              !['CANDIDATE_DISCARDED', 'CANDIDATE_UNUSABLE'].includes(detail.errorCode ?? '') &&
              task.snapshot.structuredParameters['component'] === component,
          );
          if (task.snapshot.structuredParameters['purpose'] === 'repair')
            assert.deepEqual(
              JSON.parse(String(task.snapshot.structuredParameters['baseComponents'])),
              current?.components,
              'Repair base differs from frozen adoption',
            );
          const a = detail.artifacts[0]!;
          const row = await this.studio.store.db.assetRevision.findFirstOrThrow({
            where: { projectId, assetId: a.assetId, sourceSha: a.sha256, kind: 'source' },
          });
          const original = await this.studio.store.readSource(row.id);
          const rect =
            (component === 'grass' ? input.grassRegion : input.waterRegion) ??
            defaultTerrainRegion(original.image);
          selected.push({ component, id, task, row, original, rect });
        }
        // One bounded shared palette for a full pair; repairs affect only selected sources.
        // Existing exact component colors are collected by component-palette when making the recipe.
        const palette = sharedPalette(selected.map((s) => sampleRegion(s.original.image, s.rect)));
        const paletteInputs = selected.map((s) => s.original.image.pixelHash);
        for (const { component, id, task, row, original, rect } of selected) {
          let conversion: ReturnType<typeof normalizeAiRegion>;
          try {
            conversion = normalizeAiRegion(original.image, component, rect, palette, paletteInputs);
          } catch (cause) {
            const lease = this.studio.store.gate.require();
            await this.studio.store.db.$transaction(async (tx) => {
              await lease.fence(tx);
              await tx.aiConversion.create({
                data: {
                  id: randomUUID(),
                  projectId,
                  taskId: id,
                  sourceId: row.id,
                  descriptor: {
                    version: AI_REGION_CONVERSION.version,
                    status: 'REJECTED',
                    inputPixelHash: original.image.pixelHash,
                    reason:
                      cause instanceof Error && 'code' in cause
                        ? String(cause.code)
                        : 'CONVERSION_FAILED',
                  },
                  outputs: [],
                },
              });
              await tx.logicalTask.update({
                where: { id },
                data: { errorCode: 'CANDIDATE_UNUSABLE', version: { increment: 1 } },
              });
            });
            if (task.snapshot.model.provider === 'wavespeed')
              await recordStep09(this.budgetRoot, id, 'UNUSABLE');
            throw cause;
          }
          const outputs: string[] = [];
          for (const [i, frame] of conversion.frames.entries()) {
            const c =
              component === 'grass' ? 'grass' : (`water-${i}` as 'water-0' | 'water-1' | 'water-2');
            const saved = await this.studio.upload(
              projectId,
              c,
              2,
              await encodePng(frame),
              signal,
              {
                origin: 'deterministic',
                author: 'AI Tileset Studio controlled normalization',
                license: original.raw.provenance.license,
                toolVersion: AI_REGION_CONVERSION.version,
                parents: selected.map((s) => s.original.ref),
              },
            );
            sources[c] = saved.id;
            outputs.push(saved.id);
          }
          const conversionId = fingerprint({
            projectId,
            taskId: id,
            outputs,
            descriptor: conversion.descriptor,
          });
          const lease = this.studio.store.gate.require();
          await this.studio.store.db.$transaction(async (tx) => {
            await lease.fence(tx);
            await tx.aiConversion.create({
              data: {
                id: conversionId,
                projectId,
                taskId: id,
                sourceId: row.id,
                descriptor: dbJson({ ...conversion.descriptor, status: 'CONVERTED' }),
                outputs,
              },
            });
          });
        }
        // Fixed geometry is reused byte-for-byte; the initial bank captures grass under the fixed mask, preserving bank pixels during later component repair.
        if (!sources['mask'])
          sources['mask'] = (
            await this.studio.upload(
              projectId,
              'mask',
              2,
              Buffer.from(this.studio.resources.presets.art.sources[4]!.png, 'base64'),
              signal,
            )
          ).id;
        if (
          !sources['overlay'] ||
          (input.grassTask &&
            input.waterTask &&
            selected.every((s) => s.task.snapshot.structuredParameters['purpose'] !== 'repair'))
        ) {
          const grass = await this.studio.store.readSource(sources['grass']!);
          const mask = await this.studio.store.readSource(sources['mask']!);
          const bank = blank(96, 144),
            g = grass.image.bytes(),
            m = mask.image.bytes();
          for (let i = 0; i < g.length; i += 4)
            if (m[i] === 255) bank.data.set(g.subarray(i, i + 4), i);
          sources['overlay'] = (
            await this.studio.upload(
              projectId,
              'overlay',
              2,
              await encodePng(new RgbaImage(bank)),
              signal,
              {
                origin: 'deterministic',
                author: 'AI Tileset Studio fixed bank capture',
                license: grass.raw.provenance.license,
                toolVersion: 'fixed-shore-bank-capture-v1',
                parents: [grass.ref, mask.ref],
              },
            )
          ).id;
        }
        const exact = sources as z.infer<
          typeof import('@tileset/contracts').RecipeRequestSchema
        >['sources'];
        await this.studio.recipe(projectId, {
          expectedRevision: input.expectedRevision,
          sources: exact,
          style: 'component-palette',
        });
        const next = await this.studio.state(projectId);
        return {
          sources: exact,
          revision: next.revision,
          recipeId: next.recipes.find((r) => r.current)!.id,
        };
      }),
    );
    const job = await this.studio.enqueue(projectId, {
      expectedRevision: saved.revision,
      recipeId: saved.recipeId,
      mode: 'update',
    });
    return { job, sources: saved.sources };
  }
}
/** Deterministic offline test asset, clearly marked Mock; no key/provider read. */
export async function syntheticCandidate(component: 'grass' | 'water') {
  const data = new Uint8Array(256 * 256 * 4);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const v = (Math.floor(x / 8) * 13 + Math.floor(y / 8) * 7) % 4;
      data.set(
        component === 'water' ? [0, 85 + v * 30, 170 + v * 20, 255] : [v * 25, 85 + v * 40, 0, 255],
        (y * 256 + x) * 4,
      );
    }
  return encodePng(new RgbaImage({ width: 256, height: 256, data }));
}
