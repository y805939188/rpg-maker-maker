import { beforeAll, describe, it, expect } from 'vitest';
import { archiveDomain, replayDomainArchive } from '@tileset/persistence';
import {
  replayArchives,
  ReplaySession,
  prepareBundle,
  bundleFiles,
  verifyBundleFiles,
} from '@tileset/persistence';
import { makeCompilerFixture } from '../../../scripts/step04-fixture.js';
import { archiveFixture } from '../../../scripts/pack-export.js';
import { PROFILE } from '../../../src/profile.js';
import { pairOperations, fragmentsFor } from '../../../scripts/step05-fixture.js';
import { fixture, art } from '../../material-processing/tests/fixture.js';
import { compileFragment } from '@tileset/mz-compiler';
import { codecRuntime } from '@tileset/image-adapter';
import { isValidatedSource } from '@tileset/asset-core';
let archive: ReturnType<typeof archiveFixture>;
let operations: ReturnType<typeof pairOperations>;
beforeAll(async () => {
  const f = await makeCompilerFixture('art');
  archive = archiveFixture(f);
  operations = pairOperations('replay', 1, fragmentsFor(f));
});
describe('public JSON restore boundary', () => {
  it('one bounded replay session reuses only identical validated archives and independently owned bytes', async () => {
    const session = new ReplaySession(),
      first = await replayArchives([archive], session),
      second = await replayArchives([archive], session);
    expect(second.records[0]).toBe(first.records[0]);
    expect(second.records[0]!.sources.every(isValidatedSource)).toBe(true);
    const source = second.records[0]!.sources[0]!,
      pixels = source.image.pixelHash,
      bytes = source.raw.bytes();
    bytes.fill(0);
    source.image.bytes().fill(0);
    expect(source.image.pixelHash).toBe(pixels);
    expect(source.raw.bytes()).not.toEqual(bytes);
    const corrupt = {
      ...archive,
      sources: archive.sources.map((s, n) => (n === 0 ? { ...s, png: 'AAAA' } : s)),
    };
    await expect(replayArchives([corrupt], session)).rejects.toThrow();
  });

  it('a warmed session still rejects changed validation metadata and an ended lifetime', async () => {
    const controller = new AbortController(),
      session = new ReplaySession(controller.signal);
    await replayArchives([archive], session);
    const corrupt = {
      ...archive,
      sources: archive.sources.map((s, n) =>
        n === 0 ? { ...s, validationHash: '0'.repeat(64) } : s,
      ),
    };
    await expect(replayArchives([corrupt], session)).rejects.toThrow();
    controller.abort(new Error('owned replay lifetime ended'));
    await expect(replayArchives([archive], session)).rejects.toThrow('owned replay lifetime ended');
  });

  it('restores legal engine-free RGBA IR without requiring MZ compatibility', async () => {
    const input = fixture(),
      archive = archiveDomain(input),
      restored = await replayDomainArchive(archive);
    expect(restored.built.targetCompilation).toBe('NOT_EXECUTED');
    expect(restored.built.ir.frames.map((frame) => [...frame.bytes()])).toEqual(
      art.expected.map((frame) => frame.flat()),
    );
    expect(() => compileFragment(restored.built.ir, 'a1-water')).toThrow();
    const raw = restored.sources[0]!.raw.bytes();
    raw.fill(0);
    expect(restored.sources[0]!.image.bytes()).not.toEqual(raw);
    await expect(replayDomainArchive({ ...archive, state: 'BUILT_ARTIFACT' })).rejects.toThrow();
  });

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
