import { strict as assert } from 'node:assert';
import { Prisma } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { RawSource, fingerprint, styleProfile, AssetError } from '@tileset/asset-core';
import type { ValidatedSource } from '@tileset/asset-core';
import { decodeSource, inspectPng, encodePng } from '@tileset/image-adapter';
import {
  processShoreline,
  sourceOver,
  shorelineRecipe,
  shorelineParameters,
} from '@tileset/material-processing';
import { Persistence, resolveAssetRoot, dbJson } from '@tileset/persistence';
import { PROFILE_HASH, validateProfile } from '@tileset/pack-assembly';
import { assembleExport } from '@tileset/pack-export';
import { StudioSchema, JobSchema, BuildDetailSchema, ComponentSchema } from '@tileset/contracts';
import type { Studio, Diagnostic } from '@tileset/contracts';
import { repositoryRoot } from './config.js';
import type { ServerConfig } from './config.js';
import { failure, StudioError } from './studio-errors.js';
import { sceneStates } from './studio-scenes.js';
import { visualRisks } from './studio-qa.js';
const components = ComponentSchema.options;
const roles = {
  grass: 'grass',
  'water-0': 'water',
  'water-1': 'water',
  'water-2': 'water',
  mask: 'static-mask',
  overlay: 'bank-overlay',
} as const;
export type Resources = {
  profile: unknown;
  context: Parameters<typeof assembleExport>[2];
  presets: Record<'art' | 'diagnostic', Parameters<typeof assembleExport>[1]['archives'][number]>;
};
export class StudioService {
  readonly store: Persistence;
  lastDecodedMeasurement:
    | Extract<import('@tileset/image-adapter').SourceResult, { status: 'validated' }>['measurement']
    | undefined;
  private occupied = false;
  private work: Promise<unknown> | undefined;
  private stopping = false;
  private waiting: { run: () => void; reject: (reason: unknown) => void } | undefined;
  private release() {
    this.occupied = false;
    const next = this.waiting;
    this.waiting = undefined;
    next?.run();
  }
  constructor(
    config: ServerConfig,
    readonly resources: Resources,
    assetRoot: string,
    fault?: import('@tileset/persistence').FaultHook,
    readonly decode: typeof decodeSource = decodeSource,
  ) {
    validateProfile(resources.profile);
    assert.equal(fingerprint(resources.profile), PROFILE_HASH);
    this.store = new Persistence(config.DATABASE_URL, assetRoot, resources.profile, fault);
  }
  static async open(config: ServerConfig) {
    const service = new StudioService(
      config,
      JSON.parse(
        await readFile(resolve(repositoryRoot, 'apps/api/dist/resources/studio.json'), 'utf8'),
      ) as Resources,
      await resolveAssetRoot(process.env, repositoryRoot),
    );
    await service.recover();
    return service;
  }
  async recover() {
    await this.write((tx) =>
      tx.studioJob.updateMany({
        where: { state: { in: ['QUEUED', 'RUNNING'] } },
        data: {
          state: 'FAILED',
          diagnostic: dbJson({
            code: 'INTERRUPTED',
            message: '上次本地构建中断。',
            location: '构建任务',
            recovery: '已保留成功历史；重新选择当前配方并构建。',
          }),
        },
      }),
    );
  }
  private write<T>(fn: (tx: import('@prisma/client').Prisma.TransactionClient) => Promise<T>) {
    return this.store.gate.write((lease) =>
      this.store.db.$transaction(async (tx) => {
        await lease.fence(tx);
        const r = await fn(tx);
        await lease.checkpoint();
        return r;
      }),
    );
  }
  async close() {
    this.stopping = true;
    await this.work?.catch(() => {});
    await this.store.close();
  }
  async exclusive<T>(fn: () => Promise<T>, wait = false, signal?: AbortSignal): Promise<T> {
    if (this.stopping)
      throw new StudioError(
        {
          code: 'BUSY',
          message: '服务正在停止。',
          location: '本地处理',
          recovery: '重新启动本地服务。',
        },
        429,
      );
    if (this.occupied) {
      if (wait && !this.waiting)
        return new Promise<T>((accept, reject) => {
          const abort = () => {
            if (this.waiting === queued) this.waiting = undefined;
            reject(signal?.reason);
          };
          const queued = {
            run: () => {
              signal?.removeEventListener('abort', abort);
              void this.exclusive(fn).then(accept, reject);
            },
            reject,
          };
          this.waiting = queued;
          signal?.addEventListener('abort', abort, { once: true });
          if (signal?.aborted) abort();
        });
      throw new StudioError(
        {
          code: 'BUSY',
          message: '素材处理槽正在使用。',
          location: '本地处理',
          recovery: '等待当前操作结束后重试；最多一个预览读取等待槽。',
        },
        429,
      );
    }
    this.occupied = true;
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
  async project(id: string, db: Pick<Prisma.TransactionClient, 'project'> = this.store.db) {
    const p = await db.project.findUnique({ where: { id } });
    if (!p)
      throw new StudioError(
        {
          code: 'NOT_FOUND',
          message: '项目不存在。',
          location: '项目',
          recovery: '选择已保存项目。',
        },
        404,
      );
    return p;
  }
  async sourceRow(projectId: string, id: string) {
    const row = await this.store.db.assetRevision.findFirst({
      where: { projectId, id, kind: 'source' },
    });
    if (!row?.sourceSha)
      throw new StudioError(
        {
          code: 'NOT_FOUND',
          message: '精确源版本不存在。',
          location: '源素材',
          recovery: '重新选择已导入版本。',
        },
        404,
      );
    return row;
  }
  async upload(
    projectId: string,
    component: (typeof components)[number],
    density: number,
    bytes: Uint8Array,
    signal: AbortSignal,
    provenance: import('@tileset/asset-core').Provenance = {
      origin: 'manual',
      author: 'Studio manual import',
      license: 'User supplied',
      toolVersion: 'studio-manual-v1',
      parents: [],
    },
  ) {
    await this.project(projectId);
    return this.store.gate.write(async (lease) => {
      signal.throwIfAborted();
      await lease.checkpoint();
      const logicalId = `studio-${component}`,
        old = await this.store.db.assetRevision.findFirst({
          where: { projectId, kind: 'source', logicalId },
          orderBy: { revision: 'desc' },
        });
      const inventory = await this.store.db.assetRevision.findMany({
        where: { projectId, kind: 'source' },
        include: { source: true },
      });
      if (
        inventory.length >= 768 ||
        inventory.reduce((n, r) => n + (r.source?.bytes ?? 0), 0) + bytes.length > 32 * 1024 * 1024
      )
        throw new StudioError(
          {
            code: 'SOURCE_BUDGET',
            message: '项目源版本已达到 768 个或 32 MiB 归档预算。',
            location: '源归档',
            recovery: '历史不会清理或覆盖；在新项目导入当前所需组件。',
          },
          413,
        );
      const raw = new RawSource({
        id: logicalId,
        revision: (old?.revision ?? 0) + 1,
        role: roles[component],
        density,
        encoding: 'png',
        bytes,
        provenance,
      });
      const result = await this.decode(raw, AbortSignal.any([signal, lease.signal]));
      if (result.status !== 'validated')
        throw failure(new AssetError(result.diagnostic.code, result.diagnostic.message), component);
      this.lastDecodedMeasurement = result.measurement;
      if (result.source.image.width !== 96 || result.source.image.height !== 144)
        throw new StudioError({
          code: 'SOURCE_SIZE',
          message: '固定配方需要 96×144 源样板。',
          location: component,
          recovery: '导入尺寸正确的单图 PNG；不会自动缩放。',
        });
      signal.throwIfAborted();
      await lease.checkpoint();
      const id = await this.store.saveSource(projectId, result.source, signal);
      return { id, measurement: result.measurement };
    }, `project:${projectId}`);
  }
  async preset(projectId: string, family: 'art' | 'diagnostic', signal: AbortSignal) {
    const preset = this.resources.presets[family];
    for (let i = 0; i < 6; i++)
      await this.upload(
        projectId,
        components[i]!,
        family === 'art' ? 2 : 1,
        Buffer.from(preset.sources[i]!.png, 'base64'),
        signal,
        preset.sources[i]!.descriptor.provenance,
      );
  }
  async state(projectId: string): Promise<Studio> {
    // Capture related database metadata in one short MVCC snapshot. No files,
    // PNG inspection, pixel processing or network calls run inside this read TX.
    const metadata = await this.store.db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const project = await this.project(projectId, tx);
        const recipeRows = await tx.assetRevision.findMany({
          where: { projectId, kind: 'recipe' },
        });
        const sourceRows = await tx.assetRevision.findMany({
          where: { projectId, kind: 'source' },
          orderBy: [{ logicalId: 'asc' }, { revision: 'desc' }],
        });
        const files = await tx.fileObject.findMany({
          where: { sha256: { in: sourceRows.flatMap((r) => (r.sourceSha ? [r.sourceSha] : [])) } },
        });
        const snapshot = await tx.projectSnapshot.findUnique({
          where: { projectId_revision: { projectId, revision: project.revision } },
        });
        const processing = await tx.processingRecord.findMany({
          where: { projectId, stage: 'MZ_FRAGMENTS' },
          include: { recipe: true },
          orderBy: { recipe: { revision: 'desc' } },
        });
        const dependencies = await tx.revisionDependency.findMany({
          where: { fromId: { in: processing.map((r) => r.recipeId) } },
          include: { to: true },
        });
        const builds = await tx.build.findMany({
          where: { projectId },
          include: { projectSnapshot: true, finalExport: true },
          orderBy: { createdAt: 'desc' },
        });
        const jobs = await tx.studioJob.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
          take: 30,
        });
        const tasks = await tx.logicalTask.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
          take: 30,
        });
        return {
          project,
          recipeRows,
          sourceRows,
          files,
          snapshot,
          processing,
          dependencies,
          builds,
          jobs,
          tasks,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 5000,
        maxWait: 1000,
      },
    );
    const { project } = metadata;
    const sourceComponents = new Map<string, (typeof components)[number]>();
    for (const recipe of metadata.recipeRows) {
      const v = dbJson(recipe.value)['value'] as {
        grass: { id: string; revision: number; contentHash: string };
        water: { id: string; revision: number; contentHash: string }[];
        staticMask: { id: string; revision: number; contentHash: string };
        bankOverlay: { id: string; revision: number; contentHash: string };
      };
      sourceComponents.set(`${v.grass.id}@${v.grass.revision}`, 'grass');
      v.water.forEach((r, n) => {
        if (n < 3)
          sourceComponents.set(`${r.id}@${r.revision}`, ComponentSchema.parse(`water-${n}`));
      });
      sourceComponents.set(`${v.staticMask.id}@${v.staticMask.revision}`, 'mask');
      sourceComponents.set(`${v.bankOverlay.id}@${v.bankOverlay.revision}`, 'overlay');
    }
    const sources: Studio['sources'] = [];
    for (const r of metadata.sourceRows) {
      const value = dbJson(r.value);
      if (value['encoding'] === 'rgba8') continue;
      const d = value['descriptor'] as { density: number; role: string };
      assert.ok(r.sourceSha);
      const f = metadata.files.find((f) => f.sha256 === r.sourceSha);
      assert.ok(f, 'Source file missing from metadata snapshot');
      const b = await this.store.storage.read(f),
        dimensions = inspectPng(b);
      sources.push({
        id: r.id,
        component:
          sourceComponents.get(`${r.logicalId}@${r.revision}`) ??
          (r.logicalId.startsWith('studio-')
            ? ComponentSchema.parse(r.logicalId.slice(7))
            : d.role === 'water'
              ? ('water-0' as const)
              : d.role === 'grass'
                ? ('grass' as const)
                : d.role === 'static-mask'
                  ? ('mask' as const)
                  : ('overlay' as const)),
        revision: r.revision,
        density: d.density,
        sha256: r.sourceSha,
        ...dimensions,
        url: `/api/projects/${projectId}/sources/${r.id}/png`,
        role: d.role,
      });
    }
    const snapshot = metadata.snapshot;
    const adoption = (snapshot?.adoption ?? []) as { kind: string; contentHash: string }[];
    const recipes: Studio['recipes'] = [];
    for (const row of metadata.processing) {
      const recipe = dbJson(row.recipe.value),
        v = recipe['value'] as {
          grass: { id: string; revision: number };
          water: { id: string; revision: number }[];
          staticMask: { id: string; revision: number };
          bankOverlay: { id: string; revision: number };
          style: { contentHash: string };
        };
      const deps = metadata.dependencies.filter((d) => d.fromId === row.recipeId);
      const selected: Record<string, string> = {};
      for (const dep of deps)
        if (dep.to.kind === 'source') {
          const component = sourceComponents.get(`${dep.to.logicalId}@${dep.to.revision}`);
          if (component) selected[component] = dep.toId;
        }
      recipes.push({
        id: row.recipeId,
        revision: row.recipe.revision,
        current: adoption.some(
          (r) => r.kind === 'recipe' && r.contentHash === row.recipe.contentHash,
        ),
        irHash: row.irHash,
        components: selected,
        style: v.style.contentHash,
      });
    }
    const builds: Studio['builds'] = [];
    for (const b of metadata.builds) {
      builds.push({
        id: b.id,
        version: b.expectedPackVersion + 1,
        projectRevision: b.projectSnapshot.revision,
        publication: b.publication === 'ADOPTED' ? 'ADOPTED' : 'HISTORICAL',
        current: project.successfulBuildId === b.id,
        exportBuildId: b.finalExport?.exportId ?? null,
        createdAt: b.createdAt.toISOString(),
      });
    }
    const jobs = metadata.jobs.map((j) =>
      JobSchema.parse({
        id: j.id,
        state: j.state,
        buildId: j.buildId,
        diagnostic: j.diagnostic,
        createdAt: j.createdAt.toISOString(),
      }),
    );
    const mockTasks = metadata.tasks.map((t) => ({
      id: t.id,
      state: t.state,
      archiveState: t.archiveState,
      recovery:
        t.state === 'SUBMISSION_UNKNOWN'
          ? '提交结果未知；仅核对原任务，不自动重提。'
          : t.archiveState === 'FAILED'
            ? '远端成功后仅重试本地归档。'
            : '按创建时快照保留；候选不会自动采用。',
    }));
    const current = builds.find((b) => b.current);
    return StudioSchema.parse({
      projectId,
      animation: {
        sequence: (this.resources.profile as import('@tileset/pack-export').TargetProfile).animation
          .sequence,
        updatesPerState: (this.resources.profile as import('@tileset/pack-export').TargetProfile)
          .animation.updatesPerState,
      },
      revision: project.revision,
      successfulBuildId: project.successfulBuildId,
      needsRebuild:
        !!recipes.find((r) => r.current) && current?.projectRevision !== project.revision,
      sources,
      recipes,
      builds,
      jobs,
      mockTasks,
    });
  }
  async recipe(
    projectId: string,
    input: import('zod').infer<typeof import('@tileset/contracts').RecipeRequestSchema>,
  ) {
    await this.project(projectId);
    const sources: ValidatedSource[] = [];
    for (const component of components) {
      await this.sourceRow(projectId, input.sources[component]);
      const source = await this.store.readSource(input.sources[component]);
      assert.equal(source.raw.role, roles[component]);
      sources.push(source);
    }
    const density = sources[0]!.raw.density;
    if (!sources.every((s) => s.raw.density === density))
      throw new StudioError({
        code: 'DENSITY_MISMATCH',
        message: '六个组件必须使用同一逻辑密度。',
        location: '配方',
        recovery: '重新选择密度一致的精确源版本。',
      });
    const old = await this.store.db.assetRevision.findFirst({
        where: { projectId, kind: 'recipe', logicalId: 'studio-recipe' },
        orderBy: { revision: 'desc' },
      }),
      revision = (old?.revision ?? 0) + 1;
    const palette = new Map<string, [number, number, number]>();
    const paletteImages = [
      ...sources.filter((s) => s.raw.role !== 'static-mask').map((s) => s.image),
      sourceOver(sources[0]!.image, sources[5]!.image),
    ];
    for (const image of paletteImages) {
      const b = image.bytes();
      for (let i = 0; i < b.length; i += 4)
        if (b[i + 3]) palette.set(`${b[i]},${b[i + 1]},${b[i + 2]}`, [b[i]!, b[i + 1]!, b[i + 2]!]);
    }
    const style = styleProfile('studio-style', revision, {
      ...this.resources.presets[density === 2 ? 'art' : 'diagnostic'].style.value,
      logicalPixelScale: density,
      palette:
        input.style === 'component-palette'
          ? [...palette.values()]
          : this.resources.presets[density === 2 ? 'art' : 'diagnostic'].style.value.palette,
    });
    const parameters = shorelineParameters(
      'studio-parameters',
      1,
      this.resources.presets.art.parameters.value,
    );
    const recipe = shorelineRecipe('studio-recipe', revision, {
      version: 'fixed-shoreline-v1',
      grass: sources[0]!.ref,
      water: sources.slice(1, 4).map((s) => s.ref),
      staticMask: sources[4]!.ref,
      bankOverlay: sources[5]!.ref,
      style: style.ref,
      parameters: parameters.ref,
    });
    processShoreline({ sources, style, parameters, recipe });
    const archive = {
      style,
      parameters,
      recipe,
      sources: sources.map((s) => ({
        descriptor: {
          id: s.ref.id,
          revision: s.ref.revision,
          role: s.raw.role,
          density: s.raw.density,
          provenance: s.raw.provenance,
        },
        ref: s.ref,
        validationHash: s.validationHash,
        png: Buffer.from(s.raw.bytes()).toString('base64'),
      })),
    };
    const saved = await this.store.saveArchives(projectId, [archive]);
    await this.store.adopt(
      projectId,
      input.expectedRevision,
      saved.records[0]!.built.ir.dependencies,
    );
  }
  async enqueue(
    projectId: string,
    input: import('zod').infer<typeof import('@tileset/contracts').BuildRequestSchema>,
  ) {
    if (this.occupied || this.stopping)
      throw new StudioError(
        {
          code: 'BUSY',
          message: '已有素材操作正在执行。',
          location: '构建',
          recovery: '等待完成后重试。',
        },
        429,
      );
    this.occupied = true;
    let started = false;
    try {
      const project = await this.project(projectId);
      if (project.revision !== input.expectedRevision)
        throw failure(new Error('Project revision conflict'));
      const snapshot = await this.store.projectSnapshot(projectId);
      const row = await this.store.db.assetRevision.findFirstOrThrow({
        where: { id: input.recipeId, projectId, kind: 'recipe' },
      });
      assert.ok(
        (snapshot.adoption as { contentHash: string }[]).some(
          (r) => r.contentHash === row.contentHash,
        ),
        'Recipe differs from frozen adoption',
      );
      const job = await this.write((tx) =>
        tx.studioJob.create({
          data: {
            id: randomUUID(),
            projectId,
            state: 'QUEUED',
            input: dbJson({ ...input, snapshotId: snapshot.id, context: this.resources.context }),
          },
        }),
      );
      started = true;
      this.work = this.execute(job.id).finally(() => this.release());
      void this.work.catch(() => {});
      return JobSchema.parse({
        id: job.id,
        state: job.state,
        buildId: job.buildId,
        diagnostic: job.diagnostic,
        createdAt: job.createdAt.toISOString(),
      });
    } finally {
      if (!started) this.release();
    }
  }
  private async execute(id: string) {
    const controller = new AbortController(),
      timer = setTimeout(
        () =>
          controller.abort(
            new StudioError(
              {
                code: 'BUILD_TIMEOUT',
                message: '本地构建超过 60 秒预算。',
                location: '构建任务',
                recovery: '历史成功保留；减少项目源版本或检查本地服务后重试。',
              },
              408,
            ),
          ),
        60000,
      );
    try {
      const job = await this.store.db.studioJob.findUniqueOrThrow({ where: { id } }),
        input = job.input as unknown as {
          recipeId: string;
          mode: 'update' | 'retire-and-add';
          snapshotId: string;
          context: Resources['context'];
        };
      await this.write((tx) => tx.studioJob.update({ where: { id }, data: { state: 'RUNNING' } }));
      await this.store.gate.write(
        async (lease) => {
          const recipe = await this.store.readDomainRecipe(job.projectId, input.recipeId),
            project = await this.project(job.projectId);
          const prior = project.successfulBuildId
            ? await this.store.db.build.findUniqueOrThrow({
                where: { id: project.successfulBuildId },
              })
            : null;
          const pack = prior
            ? await this.store.db.pack.findUniqueOrThrow({ where: { id: prior.packId } })
            : await this.store.createPack(job.projectId, 'studio-pack');
          const archives = await this.store.loadArchives(job.projectId),
            r = archives.records.find(
              (r) => r.recipe.ref.contentHash === recipe.recipe.ref.contentHash,
            )!;
          assert.ok(r);
          const last = pack.currentBuildId ? await this.store.readBuild(pack.currentBuildId) : null;
          const active = last?.replay.snapshot.slots.find(
            (s) => s.atlas === 'A1' && s.state === 'ACTIVE',
          );
          const group =
            input.mode === 'retire-and-add'
              ? 'second'
              : active?.binding?.logicalId.startsWith('second')
                ? 'second'
                : 'first';
          const groundId =
              input.mode === 'update' && active?.binding
                ? active.binding.groundId!
                : `${group}-grass`,
            waterId =
              input.mode === 'update' && active?.binding
                ? active.binding.logicalId
                : `${group}-water`,
            existing = last?.replay.snapshot.slots.find((s) => s.binding?.logicalId === waterId);
          const operations: unknown[] = [];
          if (input.mode === 'retire-and-add' && existing)
            throw new StudioError({
              code: 'CAPACITY',
              message: '两组固定槽位已使用；退役槽位不能再分配。',
              location: 'Pack 槽位',
              recovery: '保留历史，更新当前第二组组件后重建。',
            });
          if (input.mode === 'retire-and-add') {
            assert.ok(active?.binding, 'No active pair to retire');
            operations.push(
              { operation: 'retire', logicalId: active.binding.logicalId },
              { operation: 'retire', logicalId: active.binding.groundId },
            );
          }
          const revision = (existing?.binding?.revision ?? 0) + 1,
            groundRevision =
              (last?.replay.snapshot.slots.find((s) => s.binding?.logicalId === groundId)?.binding
                ?.revision ?? 0) + 1;
          operations.push(
            {
              operation: 'put',
              logicalId: groundId,
              revision: groundRevision,
              fragmentHash: r.ground.contentHash,
              groundId: null,
            },
            {
              operation: 'put',
              logicalId: waterId,
              revision,
              fragmentHash: r.water.contentHash,
              groundId,
            },
          );
          const prepared = await this.store.prepareBuild(
            job.projectId,
            pack.id,
            input.snapshotId,
            operations,
            input.context,
          );
          await lease.checkpoint();
          const bundle = JSON.parse(
            new TextDecoder().decode(prepared.files['bundle.json']!),
          ) as Parameters<typeof assembleExport>[1];
          const standard = await assembleExport(
            this.resources.profile,
            bundle,
            input.context,
            lease.signal,
          );
          await lease.checkpoint();
          await this.store.publish(prepared, standard.files, id);
        },
        `studio-job:${id}`,
        controller.signal,
      );
    } catch (cause) {
      if ((await this.store.db.studioJob.findUnique({ where: { id } }))?.state === 'COMPLETED')
        return;
      const diagnostic: Diagnostic = failure(cause, '构建任务').diagnostic;
      await this.write((tx) =>
        tx.studioJob.update({
          where: { id },
          data: { state: 'FAILED', diagnostic: dbJson(diagnostic) },
        }),
      );
    } finally {
      clearTimeout(timer);
    }
  }
  async createExport(projectId: string, buildId: string) {
    const b = await this.store.db.build.findFirst({ where: { id: buildId, projectId } });
    if (!b)
      throw new StudioError(
        {
          code: 'NOT_FOUND',
          message: '构建不存在。',
          location: '导出',
          recovery: '选择该项目保存的构建。',
        },
        404,
      );
    if (!(await this.store.db.finalExport.findUnique({ where: { buildId } }))) {
      const old = await this.store.readBuild(buildId),
        standard = await assembleExport(
          old.replay.profile,
          old.replay.bundle,
          old.replay.bundle.context,
          this.store.gate.current()?.signal,
        );
      await this.store.attachExport(buildId, standard.files);
    }
  }
  async export(projectId: string, buildId: string) {
    const b = await this.store.db.build.findFirst({ where: { id: buildId, projectId } });
    if (!b)
      throw new StudioError(
        {
          code: 'NOT_FOUND',
          message: '构建不存在。',
          location: '构建',
          recovery: '选择该项目保存的构建。',
        },
        404,
      );
    if (!(await this.store.db.finalExport.findUnique({ where: { buildId } })))
      throw new StudioError(
        {
          code: 'EXPORT_REQUIRED',
          message: '该旧构建尚未创建标准导出。',
          location: '导出',
          recovery: '在 Studio 选择该构建，受保护的转换请求会创建标准包。',
        },
        409,
      );
    return this.store.readExport(buildId);
  }
  async detail(
    projectId: string,
    buildId: string,
    scene: Parameters<typeof sceneStates>[1],
    selectedGroup?: string,
  ) {
    const e = await this.export(projectId, buildId),
      profile = e.manifest.identity.profile,
      groups = e.input.plan.placements
        .filter((p) => p.atlas === 'A1')
        .map((p) => ({ logicalId: p.binding.logicalId, state: p.state }));
    const group =
      selectedGroup ?? groups.find((g) => g.state === 'ACTIVE')?.logicalId ?? groups[0]!.logicalId;
    const base = `/api/projects/${projectId}/builds/${buildId}`;
    const record = e.build.replay.records.find(
      (r) =>
        r.water.contentHash ===
        e.input.plan.placements.find((p) => p.binding.logicalId === group)?.binding.fragment
          .contentHash,
    )!;
    const confirmations = await this.store.db.acceptanceRecord.findMany({
      where: { buildId, category: 'VISUAL' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    return BuildDetailSchema.parse({
      descriptor: {
        buildId,
        scene,
        group,
        exportBuildId: e.manifest.buildId,
        manifestSha: e.row.manifestSha,
        profileHash: e.row.profileHash,
        compiler: e.manifest.identity.compiler,
        ...sceneStates(e.input.plan, scene, group, profile.animation.sequence, profile.tileSize),
        tileSize: profile.tileSize,
        sequence: profile.animation.sequence,
        updatesPerState: profile.animation.updatesPerState,
        logicalHz: 60,
        png: { A1: `${base}/files/A1.png`, A2: `${base}/files/A2.png` },
        manifestUrl: `${base}/files/manifest.json`,
        profileUrl: `${base}/profile`,
        groups,
      },
      qa: {
        structural: 'STRUCTURAL_PASS',
        profileBaseline: 'PROFILE_VERIFIED_STAGE_BASELINE',
        artifactMz: 'NOT_EXECUTED',
        visual:
          confirmations[0]?.status === 'PASS'
            ? 'USER_CONFIRMED'
            : confirmations[0]?.status === 'FAIL'
              ? 'USER_REJECTED'
              : 'NOT_EXECUTED',
        risks: visualRisks(record.built.ir.frames),
        limits:
          '仅启发式指标：接缝>32、颜色数≤4、帧亮度跳变>24/255、RGB 均值色变>16/255、可见变化<1%。不判美术质量；固定岸线几何会影响接缝指标。Profile 阶段实测不等于本产物 MZ 实测。',
      },
    });
  }
  async exportFile(projectId: string, buildId: string, name: string) {
    if (!(await this.store.db.build.findFirst({ where: { id: buildId, projectId } })))
      throw new StudioError(
        {
          code: 'NOT_FOUND',
          message: '构建不属于该项目。',
          location: '导出资源',
          recovery: '选择该项目的历史构建。',
        },
        404,
      );
    const e = await this.store.db.finalExport.findUniqueOrThrow({ where: { buildId } });
    const refs = e.files as Record<string, { sha256: string; bytes: number; key: string }>;
    const f = refs[name];
    assert.ok(f);
    return this.store.storage.read(f);
  }
  async sourcePng(projectId: string, id: string) {
    const r = await this.sourceRow(projectId, id);
    const f = await this.store.db.fileObject.findUniqueOrThrow({ where: { sha256: r.sourceSha! } });
    return this.store.storage.read(f);
  }
  async processed(projectId: string, recipeId: string, frame: number) {
    const r = await this.store.readDomainRecipe(projectId, recipeId);
    return encodePng(frame === -1 ? r.built.ir.groundImage : r.built.ir.frames[frame]!);
  }
}
