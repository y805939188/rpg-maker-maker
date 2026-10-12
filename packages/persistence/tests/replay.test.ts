import { beforeAll, describe, it, expect } from 'vitest';
import {
  replayArchives,
  prepareBundle,
  bundleFiles,
  verifyBundleFiles,
} from '@tileset/persistence';
import { makeCompilerFixture } from '../../../scripts/step04-fixture.js';
import { archiveFixture } from '../../../scripts/pack-export.js';
import { PROFILE } from '../../../src/profile.js';
import { pairOperations, fragmentsFor } from '../../../scripts/step05-fixture.js';
import { codecRuntime } from '@tileset/image-adapter';
let archive: ReturnType<typeof archiveFixture>;
let operations: ReturnType<typeof pairOperations>;
beforeAll(async () => {
  const f = await makeCompilerFixture('art');
  archive = archiveFixture(f);
  operations = pairOperations('replay', 1, fragmentsFor(f));
});
describe('public JSON restore boundary', () => {
  it('actually recreates owned source, IR and Compiler; caller bytes cannot mutate recovered history', async () => {
    const replay = await replayArchives([archive]),
      source = replay.records[0]!.sources[0]!,
      hash = source.image.pixelHash,
      bytes = source.raw.bytes();
    bytes.fill(0);
    source.image.bytes().fill(0);
    expect(source.image.pixelHash).toBe(hash);
    expect(source.raw.bytes()).not.toEqual(bytes);
  });
  it('rejects source/recipe corruption and fake validation states', async () => {
    const bad = {
      ...archive,
      sources: archive.sources.map((source, index) =>
        index === 0 ? { ...source, validationHash: '0'.repeat(64) } : source,
      ),
    };
    await expect(replayArchives([bad])).rejects.toThrow();
    const recipe = {
      ...archive,
      recipe: { ...archive.recipe, ref: { ...archive.recipe.ref, contentHash: '0'.repeat(64) } },
    };
    await expect(replayArchives([recipe])).rejects.toThrow();
    await expect(replayArchives([{ ...archive, state: 'BUILT_ARTIFACT' }])).rejects.toThrow();
  });
  it('snapshot before asynchronous decoding defeats caller mutation races', async () => {
    const input = { ...archive, sources: archive.sources.map((source) => ({ ...source })) },
      pending = replayArchives([input]);
    input.sources[0]!.png = 'AAAA';
    expect((await pending).records[0]!.sources[0]!.raw.bytes().length).toBeGreaterThan(4);
  });
  it('validates actual full file content against source/history replay, rejecting missing and modified files', async () => {
    const context = {
        commit: 'a'.repeat(40),
        lockSha256: 'b'.repeat(64),
        node: process.versions.node,
        codec: await codecRuntime(),
      },
      prepared = await prepareBundle(
        PROFILE,
        [archive],
        [],
        { packId: 'replay-pack', version: 1, operations },
        context,
      ),
      files = await bundleFiles(prepared.bundle);
    await verifyBundleFiles(files.files);
    const incomplete = { ...files.files };
    delete incomplete['A1.png'];
    await expect(verifyBundleFiles(incomplete)).rejects.toThrow();
    const tampered = { ...files.files, 'A1.png': new Uint8Array(files.files['A1.png']!) };
    tampered['A1.png'][30] = tampered['A1.png'][30]! ^ 1;
    await expect(verifyBundleFiles(tampered)).rejects.toThrow();
  });
});
