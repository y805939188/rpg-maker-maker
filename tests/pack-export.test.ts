import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fingerprint, hashBytes } from '@tileset/asset-core';
import { planPack } from '@tileset/pack-assembly';
import { makeCompilerFixture } from '../scripts/step04-fixture.js';
import { fragmentsFor, pairOperations } from '../scripts/step05-fixture.js';
import { archiveFixture, assembleExport, currentBuildContext, publishDirectory, readPackExport } from '../scripts/pack-export.js';
import type { BuildContext, ExportInput } from '../scripts/pack-export.js';
import { PROFILE } from '../src/profile.js';

let directory: string, input: ExportInput, context: BuildContext, output: Awaited<ReturnType<typeof assembleExport>>;
beforeAll(async()=>{
  directory=await mkdtemp(join(tmpdir(),'step05-export-')); const f=await makeCompilerFixture('art'),fragments=fragmentsFor(f);
  input={...planPack(PROFILE,{packId:'export-pack',version:1,operations:pairOperations('a',1,fragments)},[],fragments),archives:[archiveFixture(f)]};
  context=await currentBuildContext('a'.repeat(40),'b'.repeat(64));output=await assembleExport(input,context);
},30000);
afterAll(async()=>{await rm(directory,{recursive:true,force:true});});
describe('Standard Pack export and replay',()=>{
  it('owns source/request metadata before asynchronous decoding, including caller edits while pending',async()=>{
    const mutable=JSON.parse(JSON.stringify(input)),pending=assembleExport(mutable,context);
    mutable.archives[0].sources[0].descriptor.role='water';mutable.archives[0].sources.splice(1);mutable.plan.placements[0].x=0;
    const result=await pending;expect(result.manifest).toEqual(output.manifest);result.atlases.a1.bytes().fill(0);
    expect(result.atlases.a1.pixelHash).toBe(output.atlases.a1.pixelHash);
  });
  it('exports real Compiler/Assembly PNGs with exact manifest, source refs and instructions',async()=>{
    const target=join(directory,'good');await publishDirectory(target,output.files,readPackExport);const read=await readPackExport(target);
    expect(read.manifest).toEqual(output.manifest);expect(read.atlases.a1.pixelHash).toBe(output.atlases.a1.pixelHash);
    expect(read.input.snapshot.slots[2]!.binding!.fragment.source.components).toEqual(output.fragments[0]!.source.components);
    expect(read.manifest.identity.validation.independentReview).toBe('NOT_EXECUTED_BY_DESIGN');
    expect(await readFile(join(target,'INSTALL.md'),'utf8')).toContain('flags low bits=15');
    expect(Object.keys(output.files).sort()).toEqual(['A1.png','A2.png','INSTALL.md','history.json','layout.json','manifest.json','pack.json','sources.json']);
  });
  it('repeats deterministic bytes; packaging commit identity changes independently of pixels',async()=>{
    const same=await assembleExport(input,context);expect(same.files).toEqual(output.files);
    const newer=await assembleExport(input,{...context,commit:'c'.repeat(40)});
    expect(newer.manifest.buildId).not.toBe(output.manifest.buildId);expect(newer.files['A1.png']).toEqual(output.files['A1.png']);
  },30000);
  it('rejects bad atlas and a rehashed manifest/layout/source mismatch before publication; old success survives',async()=>{
    for(const [name,mutate] of [
      ['A1.png', (bytes: Uint8Array)=>{const b=new Uint8Array(bytes);b[100]=b[100]!^1;return b;}],
      ['layout.json',(bytes: Uint8Array)=>{const p=JSON.parse(Buffer.from(bytes).toString());p.placements[0].x=0;const {contentHash:_h,...body}=p;p.contentHash=fingerprint(body);return Buffer.from(JSON.stringify(p,null,2)+'\n');}],
      ['sources.json',(bytes: Uint8Array)=>{const a=JSON.parse(Buffer.from(bytes).toString());a[0].sources[0].descriptor.role='water';return Buffer.from(JSON.stringify(a,null,2)+'\n');}],
    ] as const) {
      const files={...output.files,[name]:mutate(output.files[name]!)},m=JSON.parse(Buffer.from(files['manifest.json']!).toString());
      m.identity.files[name]={sha256:hashBytes(files[name]!),bytes:files[name]!.length};m.buildId=`step05-pack-${context.commit.slice(0,12)}-${fingerprint(m.identity).slice(0,16)}`;
      files['manifest.json']=Buffer.from(JSON.stringify(m,null,2)+'\n');
      await expect(publishDirectory(join(directory,'bad-'+name),files,readPackExport)).rejects.toThrow();
    }
    expect((await readdir(directory)).sort()).toEqual(['good']); expect((await readPackExport(join(directory,'good'))).manifest).toEqual(output.manifest);
  },30000);
  it('refuses overwrite and cleans failed stages without corrupting completed output',async()=>{
    await expect(publishDirectory(join(directory,'good'),output.files,readPackExport)).rejects.toThrow(/exists/);
    await expect(publishDirectory(join(directory,'failure'),output.files,async path=>{await writeFile(join(path,'A2.png'),new Uint8Array());throw Error('injected verification failure');})).rejects.toThrow(/injected/);
    expect((await readdir(directory)).sort()).toEqual(['good']);expect(hashBytes(await readFile(join(directory,'good','A2.png')))).toBe(hashBytes(output.files['A2.png']!));
  });
  it('rejects missing history and source JSON fields/holes instead of believing successful status',async()=>{
    const changed=JSON.parse(JSON.stringify(input));changed.archives[0].sources[0].state='VALIDATED_SOURCE';await expect(assembleExport(changed,context)).rejects.toThrow();
    changed.archives[0].sources=new Array(6);await expect(assembleExport(changed,context)).rejects.toThrow();
    const p=JSON.parse(JSON.stringify(input));p.snapshot.version=2;await expect(assembleExport(p,context)).rejects.toThrow();
  });
});
