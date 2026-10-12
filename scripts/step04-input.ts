import { strict as assert } from 'node:assert';
import { readFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RawSource, buildProcessedAsset, fingerprint, hashBytes, RgbaImage, sameRef } from '@tileset/asset-core';
import { decodeSource } from '@tileset/image-adapter';
import { processShoreline } from '@tileset/material-processing';
import { compileFragment, TARGET } from '@tileset/mz-compiler';
import type { makeCompilerFixture } from './step04-fixture.js';
import { PROFILE } from '../src/profile.js';
import { fixedDiagnostic } from './step04-diagnostic.js';

type Fixture = Awaited<ReturnType<typeof makeCompilerFixture>>;
interface SampleManifest {
  buildId:string;
  identity:{ commit:string;profile:typeof PROFILE;target:typeof TARGET;files:Record<string,string>;inputs:Record<string,{irHash:string;groundFragment:string;waterFragment:string}> };
}
export async function preflightStep04(build:string) {
  const bytes=await readFile(resolve(build,'manifest.json')),manifest=JSON.parse(bytes.toString('utf8')) as SampleManifest;
  assert.match(manifest.identity.commit,/^[a-f0-9]{40}$/);assert.deepEqual(manifest.identity.profile,PROFILE);assert.deepEqual(manifest.identity.target,TARGET);
  assert.equal(manifest.buildId,`step04-mz-${manifest.identity.commit.slice(0,12)}-${fingerprint(manifest.identity).slice(0,16)}`);
  const files:Record<string,Buffer>={};
  const expected=['A1.png','A2.png','ground.fragment.png','water.fragment.png','fragments.json','revisions.json','tile-ir.json',...['grass','water-0','water-1','water-2','mask','bank-overlay'].map(n=>`sources/${n}.png`),...['ground','mask','water-0','water-1','water-2'].map(n=>`processed/${n}.png`)];
  assert.deepEqual(Object.keys(manifest.identity.files).sort(),['art','diagnostic'].flatMap(f=>expected.map(p=>`${f}/${p}`)).sort());
  for(const [name,hash]of Object.entries(manifest.identity.files)){
    const path=resolve(build,name);assert.ok((await lstat(path)).isFile());const data=await readFile(path);
    assert.equal(hashBytes(data),hash);files[name]=data;
  }
  const decode=async(name:string):Promise<RgbaImage>=>{
    const raw=new RawSource({id:'preflight',revision:1,role:'grass',density:1,encoding:'png',bytes:files[name]!,provenance:{origin:'deterministic',author:'preflight',license:'CC0-1.0',toolVersion:'step04-preflight-v1',parents:[]}});
    const result=await decodeSource(raw);if(result.status!=='validated')throw Error(result.diagnostic.code);return result.source.image;
  };
  const replays=[];
  for(const family of ['art','diagnostic']){
    const metadata=JSON.parse(files[`${family}/revisions.json`]!.toString('utf8')) as {
      sources:{file:string;descriptor:ConstructorParameters<typeof RawSource>[0];ref:Fixture['sources'][number]['ref'];validationHash:string}[];
      style:Fixture['style'];parameters:Fixture['parameters'];recipe:Fixture['recipe'];
    };
    assert.equal(metadata.sources.length,6);
    const sources=[];
    for(let i=0;i<6;i++){
      const s=metadata.sources[i]!;assert.equal(s.file,`sources/${['grass','water-0','water-1','water-2','mask','bank-overlay'][i]}.png`);
      const result=await decodeSource(new RawSource({...s.descriptor,encoding:'png',bytes:files[`${family}/${s.file}`]!}));
      if(result.status!=='validated')throw Error(result.diagnostic.code);
      assert.ok(sameRef(result.source.ref,s.ref));assert.equal(result.source.validationHash,s.validationHash);sources.push(result.source);
    }
    const built=buildProcessedAsset(processShoreline({...metadata,sources}),`${family}-processed`);
    const ground=compileFragment(built.ir,'a2-ground'),water=compileFragment(built.ir,'a1-water');
    const expected=manifest.identity.inputs[family]!;
    assert.equal(built.ir.contentHash,expected.irHash);assert.equal(ground.contentHash,expected.groundFragment);assert.equal(water.contentHash,expected.waterFragment);
    const descriptors=JSON.parse(files[`${family}/fragments.json`]!.toString('utf8')) as {ground:Record<string,unknown>;water:Record<string,unknown>};
    for(const [label,f]of [['ground',ground],['water',water]] as const){
      assert.deepEqual(descriptors[label],{...f,image:{width:f.image.width,height:f.image.height,pixelHash:f.image.pixelHash,file:`${label}.fragment.png`}});
      const pixels=await decode(`${family}/${label}.fragment.png`);assert.deepEqual(pixels.pixels(),f.image.pixels());
    }
    const a1=await decode(`${family}/A1.png`),a2=await decode(`${family}/A2.png`);
    for(const image of [a1,a2])assert.deepEqual([image.width,image.height],[768,576]);
    const atlasExpected=fixedDiagnostic(ground,water);
    assert.deepEqual(a1.pixels(),atlasExpected.a1.pixels());assert.deepEqual(a2.pixels(),atlasExpected.a2.pixels());
    const ir=built.ir;
    assert.deepEqual(JSON.parse(files[`${family}/tile-ir.json`]!.toString('utf8')),{...ir,groundImage:{pixelHash:ir.groundImage.pixelHash,file:'processed/ground.png'},staticMaskImage:{pixelHash:ir.staticMaskImage.pixelHash,file:'processed/mask.png'},frames:ir.frames.map((p,i)=>({pixelHash:p.pixelHash,file:`processed/water-${i}.png`}))});
    for(const [name,image]of [['ground',ir.groundImage],['mask',ir.staticMaskImage],...ir.frames.map((p,i)=>[`water-${i}`,p] as const)] as const)assert.deepEqual((await decode(`${family}/processed/${name}.png`)).pixels(),image.pixels());
    replays.push({family,built,ground,water,a1,a2});
  }
  return {manifest,manifestSha256:hashBytes(bytes),files,replays};
}
