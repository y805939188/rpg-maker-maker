import { strict as assert } from 'node:assert';
import { z } from 'zod';
import {
  RawSource,
  buildProcessedAsset,
  freezeJson,
  isValidatedSource,
  sameRef,
  styleProfile,
  validatedDecodedSource,
} from '@tileset/asset-core';
import type { ValidatedSource } from '@tileset/asset-core';
import { decodeSource } from '@tileset/image-adapter';
import {
  processShoreline,
  shorelineParameters,
  shorelineRecipe,
} from '@tileset/material-processing';
import { MetadataSchema, RefSchema, SourceDescriptorSchema } from './replay.js';
const SourceSchema = z
  .object({
    descriptor: SourceDescriptorSchema,
    encoding: z.enum(['png', 'rgba8']),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    ref: RefSchema,
    validationHash: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: z.string().max(5592408),
  })
  .strict();
const DomainSchema = MetadataSchema.extend({
  contract: z.literal('domain-archive-v1'),
  sources: z.array(SourceSchema).min(5).max(35),
}).strict();
export function archiveDomain(input: Parameters<typeof processShoreline>[0]) {
  assert.ok(input.sources.every(isValidatedSource));
  return freezeJson({
    contract: 'domain-archive-v1',
    style: input.style,
    parameters: input.parameters,
    recipe: input.recipe,
    sources: input.sources.map((source) => ({
      descriptor: {
        id: source.ref.id,
        revision: source.ref.revision,
        role: source.raw.role,
        density: source.raw.density,
        provenance: source.raw.provenance,
      },
      encoding: source.raw.encoding,
      width: source.image.width,
      height: source.image.height,
      ref: source.ref,
      validationHash: source.validationHash,
      bytes: Buffer.from(source.raw.bytes()).toString('base64'),
    })),
  });
}
/** Restores framework-free source/recipe/IR; Compiler is deliberately not involved. */
export async function replayDomainArchive(input: unknown, signal?: AbortSignal) {
  const archive = freezeJson(DomainSchema.parse(freezeJson(input))),
    sources: ValidatedSource[] = [];
  let total = 0;
  for (const stored of archive.sources) {
    const bytes = Buffer.from(stored.bytes, 'base64');
    assert.equal(bytes.toString('base64'), stored.bytes);
    total += bytes.length;
    assert.ok(total <= 32 * 1024 * 1024);
    const raw = new RawSource({ ...stored.descriptor, encoding: stored.encoding, bytes });
    let source: ValidatedSource;
    if (stored.encoding === 'rgba8')
      source = validatedDecodedSource(raw, {
        width: stored.width,
        height: stored.height,
        data: bytes,
      });
    else {
      const result = await decodeSource(raw, signal);
      if (result.status !== 'validated') throw Error(result.diagnostic.code);
      source = result.source;
    }
    assert.equal(source.image.width, stored.width);
    assert.equal(source.image.height, stored.height);
    assert.ok(sameRef(source.ref, stored.ref));
    assert.equal(source.validationHash, stored.validationHash);
    sources.push(source);
  }
  const style = styleProfile(archive.style.ref.id, archive.style.ref.revision, archive.style.value),
    parameters = shorelineParameters(
      archive.parameters.ref.id,
      archive.parameters.ref.revision,
      archive.parameters.value,
    ),
    recipe = shorelineRecipe(
      archive.recipe.ref.id,
      archive.recipe.ref.revision,
      archive.recipe.value,
    );
  for (const [actual, stored] of [
    [style, archive.style],
    [parameters, archive.parameters],
    [recipe, archive.recipe],
  ] as const)
    assert.ok(sameRef(actual.ref, stored.ref));
  const built = buildProcessedAsset(
    processShoreline({ style, parameters, recipe, sources }),
    'persistence-domain-replay',
  );
  return { archive, sources, style, parameters, recipe, built };
}
