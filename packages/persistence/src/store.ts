import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  fingerprint,
  freezeJson,
  sameRef,
  validateAdoptionIdentities,
  hashBytes,
  isValidatedSource,
  validatedDecodedSource,
} from '@tileset/asset-core';
import type { RevisionRef } from '@tileset/asset-core';
import { freezeTaskSnapshot, TaskStateSchema } from '@tileset/ai-gateway';
import type { TaskRecord, TaskState } from '@tileset/ai-gateway';
import { RawSource } from '@tileset/asset-core';
import { decodeSource } from '@tileset/image-adapter';
import { describeFragment } from '@tileset/pack-assembly';
import { AssetStorage, noFault } from './storage.js';
import type { FileRef, FaultHook } from './storage.js';
import { WriteGate } from './gate.js';
import type { GateLease } from './gate.js';
import {
  ReplaySession,
  RefSchema,
  SourceDescriptorSchema,
  MetadataSchema,
  replayArchives,
  prepareBundle,
  bundleFiles,
  verifyBundleFiles,
} from './replay.js';
import { archiveDomain, replayDomainArchive } from './domain.js';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const json: z.ZodType<Json> = z.lazy(() =>
  z.union([z.null(), z.boolean(), z.number().finite(), z.string(), z.array(json), z.record(json)]),
);
export const dbJson = (input: unknown): Prisma.InputJsonObject =>
  z.record(json).parse(freezeJson(input));
const revId = (projectId: string, ref: RevisionRef) =>
  fingerprint({ projectId, kind: ref.kind, id: ref.id, revision: ref.revision });
type Replay = Awaited<ReturnType<typeof replayArchives>>;
export class Persistence {
  readonly db: PrismaClient;
  readonly storage: AssetStorage;
  readonly gate: WriteGate;
  constructor(
    readonly databaseUrl: string,
    assetRoot: string,
    readonly profile: unknown,
    readonly fault: FaultHook = noFault,
  ) {
    this.gate = new WriteGate(databaseUrl);
    this.db = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: [] });
    this.storage = new AssetStorage(assetRoot, fault, () => this.gate.current());
  }
  private transaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { timeout: number },
  ) {
    const lease = this.gate.require();
    return this.db.$transaction(async (tx) => {
      await lease.fence(tx);
      const value = await operation(tx);
      await lease.checkpoint();
      return value;
    }, options);
  }
  async readSource(id: string) {
    const row = await this.db.assetRevision.findUniqueOrThrow({ where: { id } });
    assert.equal(row.kind, 'source');
    assert.ok(row.sourceSha);
    const value = dbJson(row.value),
      descriptor = SourceDescriptorSchema.parse(value['descriptor']),
      ref = RefSchema.parse(value['ref']);
    assert.equal(row.logicalId, ref.id);
    assert.equal(row.revision, ref.revision);
    assert.equal(row.contentHash, ref.contentHash);
    assert.equal(row.id, revId(row.projectId, ref));
    const file = await this.db.fileObject.findUniqueOrThrow({ where: { sha256: row.sourceSha } }),
      bytes = await this.storage.read(file);
    const encoding = z.enum(['png', 'rgba8']).parse(value['encoding'] ?? 'png'),
      raw = new RawSource({ ...descriptor, encoding, bytes });
    let source: import('@tileset/asset-core').ValidatedSource;
    if (encoding === 'rgba8')
      source = validatedDecodedSource(raw, {
        width: z.number().int().positive().parse(value['width']),
        height: z.number().int().positive().parse(value['height']),
        data: bytes,
      });
    else {
      const result = await decodeSource(raw);
      if (result.status !== 'validated') throw Error(result.diagnostic.code);
      source = result.source;
    }
    assert.ok(sameRef(source.ref, ref));
    assert.equal(source.validationHash, value['validationHash']);
    return source;
  }
  async close() {
    await this.db.$disconnect();
  }
  async createProject(name: string) {
    assert.ok(name.length > 0 && name.length <= 80);
    return this.gate.write(() => this.transaction((tx) => tx.project.create({ data: { name } })));
  }
  async saveArchives(projectId: string, value: unknown) {
    return this.gate.write(async () => {
      const replay = await replayArchives(value),
        files = new Map<string, FileRef>();
      for (const r of replay.records)
        for (const s of r.sources)
          files.set(revId(projectId, s.ref), await this.storage.put(s.raw.bytes()));
      await this.fault('source-files-durable');
      this.gate.require().check();
      await this.transaction((tx) => this.register(tx, projectId, replay, files), {
        timeout: 5000,
      });
      return replay;
    }, `project:${projectId}`);
  }
  async saveDomainArchive(projectId: string, input: unknown) {
    return this.gate.write(async () => {
      const replay = await replayDomainArchive(input),
        files = new Map<string, FileRef>();
      for (const source of replay.sources)
        files.set(revId(projectId, source.ref), await this.storage.put(source.raw.bytes()));
      const id = fingerprint({ projectId, irHash: replay.built.ir.contentHash, stage: 'IR' }),
        recipeId = revId(projectId, replay.recipe.ref);
      await this.transaction(
        async (tx) => {
          for (const source of replay.sources) {
            const file = files.get(revId(projectId, source.ref))!;
            await tx.fileObject.upsert({
              where: { sha256: file.sha256 },
              create: file,
              update: {},
            });
            const asset = await tx.originalAsset.upsert({
              where: { projectId_logicalId: { projectId, logicalId: source.ref.id } },
              create: { projectId, logicalId: source.ref.id },
              update: {},
            });
            await this.revision(
              tx,
              projectId,
              source.ref,
              {
                descriptor: {
                  id: source.ref.id,
                  revision: source.ref.revision,
                  role: source.raw.role,
                  density: source.raw.density,
                  provenance: source.raw.provenance,
                },
                ref: source.ref,
                validationHash: source.validationHash,
                ...(source.raw.encoding === 'rgba8'
                  ? { encoding: 'rgba8', width: source.image.width, height: source.image.height }
                  : {}),
              },
              asset.id,
              file.sha256,
            );
          }
          for (const revision of [replay.style, replay.parameters, replay.recipe])
            await this.revision(tx, projectId, revision.ref, revision);
          for (const ref of replay.built.ir.dependencies.filter(
            (ref) => !sameRef(ref, replay.recipe.ref),
          )) {
            const toId = revId(projectId, ref);
            await tx.revisionDependency.upsert({
              where: { fromId_toId: { fromId: recipeId, toId } },
              create: { fromId: recipeId, toId },
              update: {},
            });
          }
          const descriptor = dbJson({
            contract: 'tile-ir-v1',
            irHash: replay.built.ir.contentHash,
            artifactHash: replay.built.artifactHash,
            targetCompilation: replay.built.targetCompilation,
            dependencies: replay.built.ir.dependencies,
          });
          const old = await tx.processingRecord.findUnique({ where: { id } });
          if (old) assert.deepEqual(old.descriptor, descriptor);
          else
            await tx.processingRecord.create({
              data: {
                id,
                projectId,
                recipeId,
                irHash: replay.built.ir.contentHash,
                stage: 'IR',
                descriptor,
              },
            });
        },
        { timeout: 5000 },
      );
      return { id, recipeId, ...replay };
    }, `project:${projectId}`);
  }
  async readDomainRecipe(projectId: string, recipeId: string) {
    const recipe = await this.db.assetRevision.findUniqueOrThrow({ where: { id: recipeId } });
    assert.equal(recipe.projectId, projectId);
    assert.equal(recipe.kind, 'recipe');
    const deps = await this.db.revisionDependency.findMany({
        where: { fromId: recipeId },
        include: { to: true },
      }),
      sources: import('@tileset/asset-core').ValidatedSource[] = [],
      metadata: Record<string, unknown> = { recipe: recipe.value };
    for (const dep of deps) {
      assert.equal(dep.to.projectId, projectId);
      if (dep.to.kind === 'source') sources.push(await this.readSource(dep.toId));
      else metadata[dep.to.kind] = dep.to.value;
    }
    const parsed = MetadataSchema.parse(metadata),
      replay = await replayDomainArchive(archiveDomain({ ...parsed, sources }));
    const record = await this.db.processingRecord.findFirstOrThrow({
      where: { projectId, recipeId, irHash: replay.built.ir.contentHash },
    });
    assert.equal(recipeId, revId(projectId, replay.recipe.ref));
    assert.equal(recipe.contentHash, replay.recipe.ref.contentHash);
    const descriptor = dbJson(record.descriptor);
    assert.equal(descriptor['irHash'], replay.built.ir.contentHash);
    assert.equal(descriptor['artifactHash'], replay.built.artifactHash);
    if (record.stage === 'IR')
      assert.deepEqual(
        descriptor,
        dbJson({
          contract: 'tile-ir-v1',
          irHash: replay.built.ir.contentHash,
          artifactHash: replay.built.artifactHash,
          targetCompilation: replay.built.targetCompilation,
          dependencies: replay.built.ir.dependencies,
        }),
      );
    return replay;
  }
  private async register(
    tx: Prisma.TransactionClient,
    projectId: string,
    replay: Replay,
    files: Map<string, FileRef>,
  ) {
    for (const r of replay.records) {
      for (const source of r.sources) {
        const file = files.get(revId(projectId, source.ref));
        assert.ok(file);
        await tx.fileObject.upsert({ where: { sha256: file.sha256 }, create: file, update: {} });
        const asset = await tx.originalAsset.upsert({
          where: { projectId_logicalId: { projectId, logicalId: source.ref.id } },
          create: { projectId, logicalId: source.ref.id },
          update: {},
        });
        await this.revision(
          tx,
          projectId,
          source.ref,
          {
            descriptor: {
              id: source.ref.id,
              revision: source.ref.revision,
              role: source.raw.role,
              density: source.raw.density,
              provenance: source.raw.provenance,
            },
            ref: source.ref,
            validationHash: source.validationHash,
          },
          asset.id,
          file.sha256,
        );
      }
      for (const revision of [r.style, r.parameters, r.recipe])
        await this.revision(tx, projectId, revision.ref, revision);
      const fromId = revId(projectId, r.recipe.ref);
      for (const ref of r.built.ir.dependencies.filter((ref) => !sameRef(ref, r.recipe.ref))) {
        const toId = revId(projectId, ref);
        await tx.revisionDependency.upsert({
          where: { fromId_toId: { fromId, toId } },
          create: { fromId, toId },
          update: {},
        });
      }
      const descriptor = dbJson({
        irHash: r.built.ir.contentHash,
        artifactHash: r.built.artifactHash,
        ground: describeFragment(r.ground),
        water: describeFragment(r.water),
      });
      const id = fingerprint({ projectId, irHash: r.built.ir.contentHash });
      const existing = await tx.processingRecord.findUnique({ where: { id } });
      if (existing) assert.deepEqual(existing.descriptor, descriptor);
      else
        await tx.processingRecord.create({
          data: {
            id,
            projectId,
            recipeId: fromId,
            irHash: r.built.ir.contentHash,
            stage: 'MZ_FRAGMENTS',
            descriptor,
          },
        });
    }
  }
  private async revision(
    tx: Prisma.TransactionClient,
    projectId: string,
    ref: RevisionRef,
    value: unknown,
    assetId?: string,
    sourceSha?: string,
  ) {
    const id = revId(projectId, ref),
      data = dbJson(value),
      old = await tx.assetRevision.findUnique({ where: { id } });
    if (old) {
      assert.equal(old.contentHash, ref.contentHash, 'Immutable revision conflict');
      assert.deepEqual(old.value, data);
      assert.equal(old.sourceSha, sourceSha ?? null);
      return;
    }
    await tx.assetRevision.create({
      data: {
        id,
        projectId,
        kind: ref.kind,
        logicalId: ref.id,
        revision: ref.revision,
        contentHash: ref.contentHash,
        value: data,
        ...(assetId ? { assetId } : {}),
        ...(sourceSha ? { sourceSha } : {}),
      },
    });
  }
  async loadArchives(projectId: string, session?: ReplaySession) {
    const rows = await this.db.assetRevision.findMany({ where: { projectId } }),
      archives = [];
    for (const row of rows) {
      const ref = RefSchema.parse(dbJson(row.value)['ref']);
      assert.equal(ref.kind, row.kind);
      assert.equal(ref.id, row.logicalId);
      assert.equal(ref.revision, row.revision);
      assert.equal(ref.contentHash, row.contentHash);
      assert.equal(row.id, revId(projectId, ref));
    }
    const nativeRecipes = new Set(
      (
        await this.db.processingRecord.findMany({ where: { projectId, stage: 'MZ_FRAGMENTS' } })
      ).map((r) => r.recipeId),
    );
    for (const recipe of rows.filter((r) => r.kind === 'recipe' && nativeRecipes.has(r.id))) {
      const stored = dbJson(recipe.value),
        r = RefSchema.parse(stored['ref']);
      assert.equal(revId(projectId, r), recipe.id);
      assert.equal(r.contentHash, recipe.contentHash);
      const deps = await this.db.revisionDependency.findMany({ where: { fromId: recipe.id } }),
        sources = [],
        meta: Record<string, unknown> = { recipe: recipe.value };
      for (const dep of deps) {
        const row = rows.find((r) => r.id === dep.toId);
        assert.ok(row, 'Missing recipe dependency');
        if (row.kind === 'source') {
          assert.ok(row.sourceSha);
          const file = await this.db.fileObject.findUniqueOrThrow({
            where: { sha256: row.sourceSha },
          });
          const bytes = await this.storage.read(file);
          sources.push({ ...dbJson(row.value), png: Buffer.from(bytes).toString('base64') });
        } else meta[row.kind] = row.value;
      }
      // Source order is immaterial to processShoreline; archive identity is canonicalized by reference.
      sources.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      archives.push({ ...meta, sources });
    }
    const replay = await replayArchives(archives, session);
    for (const r of replay.records) {
      const stored = await this.db.processingRecord.findUniqueOrThrow({
        where: {
          projectId_irHash_stage: {
            projectId,
            irHash: r.built.ir.contentHash,
            stage: 'MZ_FRAGMENTS',
          },
        },
      });
      assert.deepEqual(
        stored.descriptor,
        dbJson({
          irHash: r.built.ir.contentHash,
          artifactHash: r.built.artifactHash,
          ground: describeFragment(r.ground),
          water: describeFragment(r.water),
        }),
      );
    }
    return replay;
  }
  async adopt(projectId: string, expectedRevision: number, adoption: readonly RevisionRef[]) {
    validateAdoptionIdentities(adoption);
    const owned = freezeJson(adoption);
    return this.gate.write(
      () =>
        this.transaction(async (tx) => {
          for (const ref of owned) {
            const row = await tx.assetRevision.findUniqueOrThrow({
              where: { id: revId(projectId, ref) },
            });
            assert.equal(row.contentHash, ref.contentHash);
          }
          const updated = await tx.project.updateMany({
            where: { id: projectId, revision: expectedRevision },
            data: { revision: { increment: 1 } },
          });
          assert.equal(updated.count, 1, 'Project revision conflict');
          const revision = expectedRevision + 1,
            contentHash = fingerprint({ projectId, revision, adoption: owned }),
            id = fingerprint({ projectId, revision });
          return tx.projectSnapshot.create({
            data: {
              id,
              projectId,
              revision,
              contentHash,
              adoption: owned.map((ref) => dbJson(ref)),
            },
          });
        }),
      `project:${projectId}`,
    );
  }
  async projectSnapshot(projectId: string) {
    return this.gate.write(async () => {
      const project = await this.db.project.findUniqueOrThrow({ where: { id: projectId } }),
        id = fingerprint({ projectId, revision: project.revision });
      return this.transaction((tx) =>
        tx.projectSnapshot.upsert({
          where: { id },
          create: {
            id,
            projectId,
            revision: project.revision,
            contentHash: fingerprint({ projectId, revision: project.revision, adoption: [] }),
            adoption: [],
          },
          update: {},
        }),
      );
    }, `project:${projectId}`);
  }
  async createPack(projectId: string, logicalId: string) {
    assert.match(logicalId, /^[a-z][a-z0-9-]{0,63}$/);
    const id = fingerprint({ projectId, logicalId });
    return this.gate.write(() =>
      this.transaction((tx) =>
        tx.pack.upsert({ where: { id }, create: { id, projectId, logicalId }, update: {} }),
      ),
    );
  }
  async prepareBuild(
    projectId: string,
    packId: string,
    projectSnapshotId: string,
    operations: unknown,
    context: Parameters<typeof prepareBundle>[4],
  ) {
    const pack = await this.db.pack.findUniqueOrThrow({ where: { id: packId } });
    assert.equal(pack.projectId, projectId);
    const snapshot = await this.db.projectSnapshot.findUniqueOrThrow({
      where: { id: projectSnapshotId },
    });
    assert.equal(snapshot.projectId, projectId);
    const session = new ReplaySession();
    const archives = await this.loadArchives(projectId, session),
      history = await this.db.packVersion.findMany({
        where: { packId },
        orderBy: { version: 'asc' },
      });
    const replay = await prepareBundle(
      this.profile,
      archives.archives,
      history.map((r) => r.snapshot),
      { packId: pack.logicalId, version: pack.version + 1, operations },
      context,
      session,
    );
    const prepared = await bundleFiles(replay.bundle, session);
    const id = fingerprint({
      projectId,
      packId,
      projectSnapshotId,
      expectedPackVersion: pack.version,
      bundleHash: prepared.manifest.bundleHash,
    });
    return {
      id,
      projectId,
      packId,
      projectSnapshotId,
      expectedPackVersion: pack.version,
      files: prepared.files,
    };
  }
  async publish(input: Awaited<ReturnType<Persistence['prepareBuild']>>) {
    // Copy before asynchronous work. Re-read all metadata and actual source/IR/PNG content.
    const metadata = freezeJson({
      id: input.id,
      projectId: input.projectId,
      packId: input.packId,
      projectSnapshotId: input.projectSnapshotId,
      expectedPackVersion: input.expectedPackVersion,
    });
    const files = Object.fromEntries(
      Object.entries(input.files).map(([name, bytes]) => [name, new Uint8Array(bytes)]),
    );
    return this.gate.write(async () => {
      const verified = await verifyBundleFiles(files);
      return this.publishVerified(metadata, files, verified);
    }, `pack:${metadata.packId}`);
  }
  private async publishVerified(
    metadata: Omit<Awaited<ReturnType<Persistence['prepareBuild']>>, 'files'>,
    files: Record<string, Uint8Array>,
    verified: Awaited<ReturnType<typeof verifyBundleFiles>>,
  ) {
    assert.equal(
      metadata.id,
      fingerprint({
        projectId: metadata.projectId,
        packId: metadata.packId,
        projectSnapshotId: metadata.projectSnapshotId,
        expectedPackVersion: metadata.expectedPackVersion,
        bundleHash: verified.manifest.bundleHash,
      }),
    );
    const snapshot = await this.db.projectSnapshot.findUniqueOrThrow({
      where: { id: metadata.projectSnapshotId },
    });
    assert.equal(snapshot.projectId, metadata.projectId);
    const pack = await this.db.pack.findUniqueOrThrow({ where: { id: metadata.packId } });
    assert.equal(pack.projectId, metadata.projectId);
    assert.equal(verified.replay.snapshot.packId, pack.logicalId);
    assert.equal(verified.replay.snapshot.version, metadata.expectedPackVersion + 1);
    const adopted = RefSchema.array().parse(snapshot.adoption);
    for (const ref of adopted)
      assert.ok(
        verified.replay.records.some((r) => r.built.ir.dependencies.some((d) => sameRef(ref, d))),
        'Build does not match project adoption',
      );
    const canonicalHistory = await this.db.packVersion.findMany({
      where: { packId: metadata.packId, version: { lte: metadata.expectedPackVersion } },
      orderBy: { version: 'asc' },
    });
    assert.equal(
      canonicalHistory.length,
      metadata.expectedPackVersion,
      'Missing canonical Pack history',
    );
    assert.deepEqual(
      verified.replay.history,
      canonicalHistory.map((row) => row.snapshot),
      'Build history differs from durable Pack history',
    );
    if (adopted.length)
      for (const placement of verified.replay.plan.placements.filter((p) => p.state === 'ACTIVE'))
        for (const dependency of placement.binding.fragment.source.dependencies)
          assert.ok(
            adopted.some((ref) => sameRef(ref, dependency)),
            'Active build dependency differs from frozen project adoption',
          );
    await this.storage.publish(metadata.id, files, async (reread) => {
      assert.deepEqual(Object.keys(reread).sort(), Object.keys(files).sort());
      for (const name of Object.keys(files)) assert.deepEqual(reread[name], files[name]);
    });
    const refs = new Map<string, FileRef>();
    for (const [name, bytes] of Object.entries(files))
      refs.set(name, await this.storage.put(bytes));
    const sourceFiles = new Map<string, FileRef>();
    for (const r of verified.replay.records)
      for (const source of r.sources)
        sourceFiles.set(
          revId(metadata.projectId, source.ref),
          await this.storage.put(source.raw.bytes()),
        );
    await this.fault('before-db-commit');
    this.gate.require().check();
    const result = await this.transaction(
      async (tx) => {
        const existing = await tx.build.findUnique({ where: { id: metadata.id } });
        if (existing) {
          assert.equal(existing.manifestSha, hashBytes(files['manifest.json']!));
          return existing;
        }
        const project = await tx.project.findUniqueOrThrow({ where: { id: metadata.projectId } }),
          head = await tx.pack.findUniqueOrThrow({ where: { id: metadata.packId } });
        const current =
          project.revision === snapshot.revision && head.version === metadata.expectedPackVersion;
        await this.register(tx, metadata.projectId, verified.replay, sourceFiles);
        for (const ref of refs.values())
          await tx.fileObject.upsert({ where: { sha256: ref.sha256 }, create: ref, update: {} });
        const build = await tx.build.create({
          data: {
            ...metadata,
            snapshotHash: verified.replay.snapshot.contentHash,
            manifestSha: hashBytes(files['manifest.json']!),
            directory: `builds/${metadata.id}`,
            publication: current ? 'ADOPTED' : 'HISTORICAL',
            metadata: dbJson(verified.manifest),
            files: { create: [...refs].map(([name, ref]) => ({ name, sha256: ref.sha256 })) },
          },
        });
        if (current) {
          const versionId = fingerprint({
            packId: metadata.packId,
            version: verified.replay.snapshot.version,
          });
          await tx.packVersion.create({
            data: {
              id: versionId,
              packId: metadata.packId,
              version: verified.replay.snapshot.version,
              hash: verified.replay.snapshot.contentHash,
              snapshot: dbJson(verified.replay.snapshot),
              slots: {
                create: verified.replay.snapshot.slots.map((s) => ({
                  atlas: s.atlas,
                  kind: s.kind,
                  state: s.state,
                  binding: s.binding ? dbJson(s.binding) : Prisma.JsonNull,
                })),
              },
            },
          });
          const changed = await tx.pack.updateMany({
            where: { id: metadata.packId, version: metadata.expectedPackVersion },
            data: {
              version: { increment: 1 },
              headHash: verified.replay.snapshot.contentHash,
              currentBuildId: metadata.id,
            },
          });
          assert.equal(changed.count, 1, 'Pack CAS conflict');
          const projectChanged = await tx.project.updateMany({
            where: { id: metadata.projectId, revision: snapshot.revision },
            data: { successfulBuildId: metadata.id },
          });
          assert.equal(projectChanged.count, 1, 'Project CAS conflict');
        }
        await this.fault('db-transaction');
        this.gate.require().check();
        return build;
      },
      { timeout: 5000 },
    );
    await this.fault('after-db-commit');
    this.gate.require().check();
    return result;
  }
  async readBuild(id: string, session?: ReplaySession) {
    const record = await this.db.build.findUniqueOrThrow({ where: { id } });
    const files = await this.storage.buildFiles(id),
      verified = await verifyBundleFiles(files, session);
    assert.equal(record.manifestSha, hashBytes(files['manifest.json']!));
    assert.deepEqual(record.metadata, dbJson(verified.manifest));
    const references = await this.db.buildFile.findMany({
      where: { buildId: id },
      include: { file: true },
    });
    assert.deepEqual(references.map((r) => r.name).sort(), Object.keys(files).sort());
    assert.equal(record.directory, `builds/${id}`);
    assert.equal(record.snapshotHash, verified.replay.snapshot.contentHash);
    for (const ref of await this.db.buildFile.findMany({
      where: { buildId: id },
      include: { file: true },
    })) {
      assert.equal(hashBytes(files[ref.name]!), ref.sha256);
      await this.storage.read(ref.file);
    }
    return { record, ...verified };
  }
  async acceptance(
    buildId: string,
    category: 'STRUCTURAL' | 'VISUAL' | 'EDITOR' | 'GAME' | 'INDEPENDENT_REVIEW',
    status: 'PASS' | 'FAIL' | 'NOT_EXECUTED',
    evidence: unknown,
  ) {
    await this.readBuild(buildId);
    return this.gate.write(() =>
      this.transaction((tx) =>
        tx.acceptanceRecord.create({
          data: { buildId, category, status, evidence: dbJson(evidence) },
        }),
      ),
    );
  }
  async createTask(projectId: string, input: unknown) {
    const snapshot = freezeTaskSnapshot(freezeJson(input));
    assert.equal(snapshot.model.provider, 'mock', 'Only Mock is authorized');
    return this.gate.write(async () => {
      for (const reference of snapshot.references) {
        assert.match(
          reference.revision,
          /^[1-9][0-9]{0,9}$/,
          'Reference revision must be a canonical persisted integer',
        );
        const exactRevision = Number(reference.revision);
        assert.ok(
          Number.isSafeInteger(exactRevision) && exactRevision <= 2147483647,
          'Reference revision exceeds PostgreSQL Int',
        );
        const revision = await this.db.assetRevision.findFirstOrThrow({
          where: {
            projectId,
            assetId: reference.assetId,
            revision: exactRevision,
            kind: 'source',
            sourceSha: reference.sha256,
          },
        });
        assert.equal(
          String(revision.revision),
          reference.revision,
          'Task reference revision mismatch',
        );
      }
      const p = await this.db.project.findUniqueOrThrow({ where: { id: projectId } }),
        id = fingerprint({ projectId, revision: p.revision });
      const projectSnapshot = await this.db.projectSnapshot.findUniqueOrThrow({ where: { id } });
      return this.transaction((tx) =>
        tx.logicalTask.create({
          data: {
            id: randomUUID(),
            projectId,
            projectSnapshotId: projectSnapshot.id,
            snapshot: dbJson(snapshot),
            snapshotHash: fingerprint(snapshot),
            state: 'QUEUED',
          },
        }),
      );
    }, `project:${projectId}`);
  }
  async task(id: string): Promise<TaskRecord | null> {
    const row = await this.db.logicalTask.findUnique({
      where: { id },
      include: { projectSnapshot: true, artifacts: { orderBy: { ordinal: 'asc' } } },
    });
    if (!row) return null;
    const state = TaskStateSchema.parse(row.state),
      snapshot = freezeTaskSnapshot(row.snapshot);
    assert.equal(fingerprint(snapshot), row.snapshotHash);
    const base = {
      id: row.id,
      projectId: row.projectId,
      expectedProjectRevision: String(row.projectSnapshot.revision),
      snapshot,
      version: row.version,
    };
    const artifacts = row.artifacts.map((a) => ({
      assetId: a.assetId,
      revision: a.revision,
      sha256: a.sha256,
    }));
    if (
      state === 'CREATED' ||
      state === 'QUEUED' ||
      state === 'SUBMITTING' ||
      state === 'SUBMISSION_UNKNOWN'
    ) {
      assert.equal(row.predictionId, null);
      assert.equal(artifacts.length, 0);
      return { ...base, state, predictionId: null, artifacts: [] };
    }
    if (
      state === 'REMOTE_RUNNING' ||
      state === 'FETCHING_RESULT' ||
      state === 'VALIDATING_AND_INGESTING'
    ) {
      assert.ok(row.predictionId);
      assert.equal(artifacts.length, 0);
      return { ...base, state, predictionId: row.predictionId, artifacts: [] };
    }
    if (state === 'COMPLETED') {
      assert.ok(row.predictionId && artifacts.length > 0);
      return {
        ...base,
        state,
        predictionId: row.predictionId,
        artifacts: [artifacts[0]!, ...artifacts.slice(1)],
      };
    }
    return { ...base, state, predictionId: row.predictionId, artifacts };
  }
  async taskScope<T>(id: string, operation: (lease: GateLease) => Promise<T>) {
    return this.gate.write(operation, `task:${id}`);
  }
  async taskIntent(id: string, expectedVersion: number) {
    return this.transaction(async (tx) => {
      const changed = await tx.logicalTask.updateMany({
        where: {
          id,
          version: expectedVersion,
          state: { in: ['QUEUED', 'CREATED'] },
          localCancelled: false,
        },
        data: { state: 'SUBMITTING', version: { increment: 1 } },
      });
      assert.equal(changed.count, 1, 'Task intent CAS conflict');
      return tx.submissionAttempt.create({
        data: { id: randomUUID(), taskId: id, sequence: 1, state: 'INTENT' },
      });
    });
  }
  async taskTransition(
    id: string,
    expectedVersion: number,
    state: TaskState,
    extra: {
      predictionId?: string;
      archiveState?: string;
      result?: unknown;
      errorCode?: string;
      localCancelled?: boolean;
      remoteCancellation?: string;
    } = {},
  ) {
    const old = await this.db.logicalTask.findUniqueOrThrow({ where: { id } });
    assert.equal(old.version, expectedVersion);
    const allowed: Record<string, readonly TaskState[]> = {
      CREATED: ['QUEUED', 'CANCELLED_LOCAL'],
      QUEUED: ['CANCELLED_LOCAL'],
      SUBMITTING: ['CANCELLED_LOCAL'],
      SUBMISSION_UNKNOWN: ['CANCELLED_LOCAL'],
      REMOTE_RUNNING: ['FETCHING_RESULT', 'FAILED', 'CANCELLED_LOCAL'],
      FETCHING_RESULT: ['VALIDATING_AND_INGESTING', 'FAILED', 'CANCELLED_LOCAL'],
      VALIDATING_AND_INGESTING: ['FETCHING_RESULT', 'FAILED', 'CANCELLED_LOCAL'],
      FAILED: ['CANCELLED_LOCAL'],
      CANCEL_REQUESTED: ['CANCELLED_LOCAL'],
      COMPLETED: [],
      CANCELLED_LOCAL: [],
    };
    assert.ok(allowed[old.state]?.includes(state), 'Invalid task transition');
    const { result, ...fields } = extra;
    const changed = await this.transaction((tx) =>
      tx.logicalTask.updateMany({
        where: { id, version: expectedVersion },
        data: {
          state,
          version: { increment: 1 },
          ...fields,
          ...(result ? { result: dbJson(result) } : {}),
        },
      }),
    );
    assert.equal(changed.count, 1, 'Task CAS conflict');
  }
  async submissionOutcome(
    id: string,
    expectedVersion: number,
    attemptId: string,
    outcome: 'KNOWN' | 'UNKNOWN' | 'REJECTED',
    predictionId?: string,
  ) {
    await this.transaction(async (tx) => {
      const changed = await tx.logicalTask.updateMany({
        where: { id, version: expectedVersion, state: 'SUBMITTING' },
        data: {
          state:
            outcome === 'KNOWN'
              ? 'REMOTE_RUNNING'
              : outcome === 'UNKNOWN'
                ? 'SUBMISSION_UNKNOWN'
                : 'FAILED',
          version: { increment: 1 },
          ...(predictionId ? { predictionId } : {}),
        },
      });
      assert.equal(changed.count, 1);
      await tx.submissionAttempt.update({
        where: { id: attemptId },
        data: { state: outcome, ...(predictionId ? { predictionId } : {}) },
      });
    });
  }
  async recoverUnknown(id: string, expectedVersion: number) {
    await this.transaction(async (tx) => {
      const changed = await tx.logicalTask.updateMany({
        where: { id, version: expectedVersion, state: 'SUBMITTING' },
        data: { state: 'SUBMISSION_UNKNOWN', version: { increment: 1 } },
      });
      assert.equal(changed.count, 1);
      await tx.submissionAttempt.updateMany({
        where: { taskId: id, state: 'INTENT' },
        data: { state: 'UNKNOWN' },
      });
    });
  }
  async archived(
    id: string,
    expectedVersion: number,
    sources: readonly { source: import('@tileset/asset-core').ValidatedSource; file: FileRef }[],
  ) {
    assert.ok(sources.length > 0 && sources.length <= 8);
    for (const item of sources) {
      assert.ok(isValidatedSource(item.source));
      assert.equal(hashBytes(item.source.raw.bytes()), item.file.sha256);
      await this.storage.read(item.file);
    }

    await this.transaction(async (tx) => {
      const task = await tx.logicalTask.findUniqueOrThrow({
        where: { id },
        include: { projectSnapshot: true },
      });
      assert.equal(task.version, expectedVersion);
      assert.equal(task.localCancelled, false);
      for (const [ordinal, { source, file }] of sources.entries()) {
        await tx.fileObject.upsert({ where: { sha256: file.sha256 }, create: file, update: {} });
        const asset = await tx.originalAsset.upsert({
          where: { projectId_logicalId: { projectId: task.projectId, logicalId: source.ref.id } },
          create: { projectId: task.projectId, logicalId: source.ref.id },
          update: {},
        });
        await this.revision(
          tx,
          task.projectId,
          source.ref,
          {
            descriptor: {
              id: source.ref.id,
              revision: source.ref.revision,
              role: source.raw.role,
              density: source.raw.density,
              provenance: source.raw.provenance,
            },
            ref: source.ref,
            validationHash: source.validationHash,
          },
          asset.id,
          file.sha256,
        );
        await tx.taskArtifact.create({
          data: {
            taskId: id,
            ordinal,
            assetId: asset.id,
            revision: String(source.ref.revision),
            sha256: file.sha256,
            sourceRef: dbJson(source.ref),
          },
        });
      }
      const changed = await tx.logicalTask.updateMany({
        where: { id, version: expectedVersion, localCancelled: false },
        data: { state: 'COMPLETED', archiveState: 'DURABLE', version: { increment: 1 } },
      });
      assert.equal(changed.count, 1);
      // Candidate results are history. Adoption is an explicit, separately versioned project action.
      await this.fault('archive-db-transaction');
      this.gate.require().check();
    });
  }
  async taskDetail(id: string) {
    return this.db.logicalTask.findUniqueOrThrow({
      where: { id },
      include: { attempts: true, artifacts: true },
    });
  }
  async pendingTasks() {
    return this.db.logicalTask.findMany({
      where: { state: { notIn: ['COMPLETED', 'FAILED', 'CANCELLED_LOCAL'] } },
    });
  }
}
