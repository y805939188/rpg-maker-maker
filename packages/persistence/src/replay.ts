import { strict as assert } from 'node:assert';
import { z } from 'zod';
import {
  RawSource,
  buildProcessedAsset,
  freezeJson,
  sameRef,
  styleProfile,
  fingerprint,
} from '@tileset/asset-core';
import type { ValidatedSource } from '@tileset/asset-core';
import { decodeSource, encodePng } from '@tileset/image-adapter';
import {
  processShoreline,
  shorelineParameters,
  shorelineRecipe,
} from '@tileset/material-processing';
import { compileFragment } from '@tileset/mz-compiler';
import {
  describeFragment,
  planPack,
  renderAtlas,
  validateLayout,
  validatePack,
  validateProfile,
} from '@tileset/pack-assembly';

const id = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const integer = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const RefSchema = z
  .object({
    kind: z.enum(['source', 'style', 'parameters', 'recipe']),
    id,
    revision: integer,
    contentHash: hash,
  })
  .strict();
const provenance = z
  .object({
    origin: z.enum(['manual', 'deterministic', 'ai']),
    author: z.string(),
    license: z.string(),
    toolVersion: z.string(),
    parents: z.array(RefSchema).max(32),
  })
  .strict();
export const SourceDescriptorSchema = z
  .object({
    id,
    revision: integer,
    role: z.enum(['grass', 'water', 'static-mask', 'bank-overlay']),
    density: integer,
    provenance,
  })
  .strict();
const style = z
  .object({
    logicalPixelScale: integer,
    palette: z.array(z.tuple([z.number(), z.number(), z.number()])),
    lighting: z.enum(['flat', 'top-left']),
    outline: z.enum(['none', 'dark']),
  })
  .strict();
const rect = z
  .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
  .strict();
const geometry = z
  .object({
    width: integer,
    height: integer,
    tileWidth: integer,
    tileHeight: integer,
    regions: z.array(
      z
        .object({
          name: z.string(),
          role: z.enum(['center', 'edge', 'inner-corner', 'outer-corner']),
          rect,
        })
        .strict(),
    ),
  })
  .strict();
const animation = z
  .object({
    frameCount: integer,
    sequence: z.array(z.number()),
    durations: z.array(z.number()),
    timebase: z.enum(['updates', 'milliseconds']),
    loop: z.boolean(),
  })
  .strict();
const parameters = z
  .object({
    geometry,
    animation,
    composition: z.literal('linear-srgb-source-over'),
    mask: z.literal('white-static-bank'),
  })
  .strict();
const recipe = z
  .object({
    version: z.literal('fixed-shoreline-v1'),
    grass: RefSchema,
    water: z.array(RefSchema),
    staticMask: RefSchema,
    bankOverlay: RefSchema,
    style: RefSchema,
    parameters: RefSchema,
  })
  .strict();
export const MetadataSchema = z
  .object({
    style: z.object({ ref: RefSchema, value: style }).strict(),
    parameters: z.object({ ref: RefSchema, value: parameters }).strict(),
    recipe: z.object({ ref: RefSchema, value: recipe }).strict(),
  })
  .strict();
const ArchiveSchema = z
  .object({
    style: z.object({ ref: RefSchema, value: style }).strict(),
    parameters: z.object({ ref: RefSchema, value: parameters }).strict(),
    recipe: z.object({ ref: RefSchema, value: recipe }).strict(),
    sources: z
      .array(
        z
          .object({
            descriptor: SourceDescriptorSchema,
            ref: RefSchema,
            validationHash: hash,
            png: z.string().max(5592408),
          })
          .strict(),
      )
      .length(6),
  })
  .strict();
export type RecipeArchive = z.infer<typeof ArchiveSchema>;
export const jsonBytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value, null, 2) + '\n');
/** JSON is a description, never a substitute for owned source/IR/Compiler objects. */
async function replayUncached(value: unknown, signal?: AbortSignal) {
  const archives = freezeJson(z.array(ArchiveSchema).min(1).max(128).parse(freezeJson(value)));
  const records = [],
    fragments = [],
    seen = new Set<string>();
  let total = 0;
  for (const archive of archives) {
    assert.ok(!seen.has(archive.recipe.ref.contentHash), 'Duplicate recipe');
    seen.add(archive.recipe.ref.contentHash);
    const sources: ValidatedSource[] = [];
    for (const source of archive.sources) {
      assert.match(source.png, /^[A-Za-z0-9+/]*={0,2}$/);
      const bytes = Buffer.from(source.png, 'base64');
      assert.equal(bytes.toString('base64'), source.png);
      total += bytes.length;
      assert.ok(total <= 32 * 1024 * 1024, 'Archive budget exceeded');
      const result = await decodeSource(
        new RawSource({ ...source.descriptor, encoding: 'png', bytes }),
        signal,
      );
      if (result.status !== 'validated') throw Error(result.diagnostic.code);
      assert.ok(sameRef(result.source.ref, source.ref));
      assert.equal(result.source.validationHash, source.validationHash);
      sources.push(result.source);
    }
    const s = styleProfile(archive.style.ref.id, archive.style.ref.revision, archive.style.value);
    const p = shorelineParameters(
      archive.parameters.ref.id,
      archive.parameters.ref.revision,
      archive.parameters.value,
    );
    const r = shorelineRecipe(
      archive.recipe.ref.id,
      archive.recipe.ref.revision,
      archive.recipe.value,
    );
    for (const [actual, stored] of [
      [s, archive.style],
      [p, archive.parameters],
      [r, archive.recipe],
    ] as const)
      assert.ok(sameRef(actual.ref, stored.ref));
    const built = buildProcessedAsset(
      processShoreline({ sources, style: s, parameters: p, recipe: r }),
      'persistence-replay',
    );
    const ground = compileFragment(built.ir, 'a2-ground'),
      water = compileFragment(built.ir, 'a1-water');
    fragments.push(ground, water);
    records.push({ archive, sources, style: s, parameters: p, recipe: r, built, ground, water });
  }
  return { archives, records, fragments };
}

/** Per-operation cache stores only identical archives that have already crossed every public boundary. */
export class ReplaySession {
  constructor(readonly signal?: AbortSignal) {}
  #cache = new Map<string, Awaited<ReturnType<typeof replayUncached>>>();
  #retainedBytes = 0;
  async replay(value: unknown) {
    this.signal?.throwIfAborted();
    const archives = freezeJson(z.array(ArchiveSchema).min(1).max(128).parse(freezeJson(value)));
    const records: Awaited<ReturnType<typeof replayUncached>>['records'] = [],
      fragments: Awaited<ReturnType<typeof replayUncached>>['fragments'] = [];
    let total = 0;
    const seen = new Set<string>();
    for (const archive of archives) {
      this.signal?.throwIfAborted();
      assert.ok(!seen.has(archive.recipe.ref.contentHash));
      seen.add(archive.recipe.ref.contentHash);
      for (const source of archive.sources) {
        const bytes = Buffer.from(source.png, 'base64');
        assert.equal(bytes.toString('base64'), source.png);
        total += bytes.length;
        assert.ok(total <= 32 * 1024 * 1024);
      }
      const key = fingerprint({
        ...archive,
        sources: [...archive.sources].sort((a, b) => a.ref.id.localeCompare(b.ref.id)),
      });
      let replay = this.#cache.get(key);
      if (!replay) {
        replay = await replayUncached([archive], this.signal);
        for (const record of replay.records) {
          Object.freeze(record.sources);
          Object.freeze(record);
        }
        Object.freeze(replay.records);
        Object.freeze(replay.fragments);
        Object.freeze(replay);
        const record = replay.records[0]!;
        const retained =
          record.sources.reduce(
            (n, s) => n + s.raw.bytes().length + s.image.width * s.image.height * 4,
            0,
          ) +
          archive.sources.reduce((n, s) => n + s.png.length * 2, 0) +
          [
            record.built.ir.groundImage,
            record.built.ir.staticMaskImage,
            ...record.built.ir.frames,
            record.ground.image,
            record.water.image,
          ].reduce((n, image) => n + image.width * image.height * 4, 0);
        if (this.#cache.size < 128 && this.#retainedBytes + retained <= 32 * 1024 * 1024) {
          this.#cache.set(key, replay);
          this.#retainedBytes += retained;
        }
      }
      records.push(...replay.records);
      fragments.push(...replay.fragments);
    }
    this.signal?.throwIfAborted();
    return { archives, records, fragments };
  }
}
export async function replayArchives(value: unknown, session?: ReplaySession) {
  if (session) {
    assert.ok(session instanceof ReplaySession);
    return session.replay(value);
  }
  return replayUncached(value);
}

const BundleSchema = z
  .object({
    contract: z.literal('durable-pack-v1'),
    profile: z.unknown(),
    archives: z.unknown(),
    history: z.array(z.unknown()).max(255),
    snapshot: z.unknown(),
    plan: z.unknown(),
    context: z
      .object({
        commit: z.string().regex(/^[a-f0-9]{40}$/),
        lockSha256: hash,
        node: z.string(),
        codec: z.record(z.string()),
      })
      .strict(),
  })
  .strict();
export async function replayBundle(value: unknown, session?: ReplaySession) {
  const bundle = freezeJson(BundleSchema.parse(freezeJson(value))),
    profile = validateProfile(bundle.profile);
  const replay = await replayArchives(bundle.archives, session);
  const history = bundle.history.map((snapshot, index) =>
    validatePack(profile, snapshot, bundle.history.slice(0, index), replay.fragments),
  );
  const snapshot = validatePack(profile, bundle.snapshot, history, replay.fragments);
  const plan = validateLayout(profile, bundle.plan, snapshot, history, replay.fragments);
  const atlases = renderAtlas(profile, plan, snapshot, history, replay.fragments);
  return {
    bundle: freezeJson({ ...bundle, profile, archives: replay.archives, history, snapshot, plan }),
    ...replay,
    profile,
    history,
    snapshot,
    plan,
    atlases,
  };
}
export async function prepareBundle(
  profile: unknown,
  archives: unknown,
  history: readonly unknown[],
  request: unknown,
  context: z.infer<typeof BundleSchema>['context'],
  session = new ReplaySession(),
) {
  const replay = await replayArchives(archives, session),
    p = validateProfile(profile),
    planned = planPack(p, request, history, replay.fragments);
  return replayBundle(
    {
      contract: 'durable-pack-v1',
      profile,
      archives: replay.archives,
      ...planned,
      context,
    },
    session,
  );
}
export async function bundleFiles(value: unknown, session?: ReplaySession) {
  const replay = await replayBundle(value, session);
  const files: Record<string, Uint8Array> = {
    'bundle.json': jsonBytes(replay.bundle),
    'A1.png': await encodePng(replay.atlases.a1, session?.signal),
    'A2.png': await encodePng(replay.atlases.a2, session?.signal),
  };
  const manifest = freezeJson({
    contract: 'durable-build-v1',
    bundleHash: fingerprint(replay.bundle),
    snapshotHash: replay.snapshot.contentHash,
    layoutHash: replay.plan.contentHash,
    fragments: replay.fragments.map(describeFragment),
    files: Object.fromEntries(
      Object.entries(files).map(([name, bytes]) => [
        name,
        { sha256: fingerprintBytes(bytes), bytes: bytes.length },
      ]),
    ),
    validation: {
      structural: 'PASS',
      independentReview: 'NOT_EXECUTED',
      nativeMZ: 'NOT_EXECUTED',
      visual: 'NOT_EXECUTED',
    },
  });
  files['manifest.json'] = jsonBytes(manifest);
  return { files, manifest, replay };
}
import { hashBytes as fingerprintBytes } from '@tileset/asset-core';
export async function verifyBundleFiles(
  files: Readonly<Record<string, Uint8Array>>,
  session?: ReplaySession,
) {
  assert.deepEqual(Object.keys(files).sort(), ['A1.png', 'A2.png', 'bundle.json', 'manifest.json']);
  const parse = (name: string): unknown => JSON.parse(new TextDecoder().decode(files[name]));
  const expected = await bundleFiles(parse('bundle.json'), session);
  for (const [name, bytes] of Object.entries(expected.files))
    assert.deepEqual(files[name], bytes, `Invalid build file ${name}`);
  return expected;
}
