import { mkdtemp,mkdir,readFile,writeFile,rm,unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll,describe,it,expect } from 'vitest';
import { compileFixedPrototype } from '../src/compiler.js';
import { decodePng,encodePng,blank } from '../src/pixels.js';
import { preflightPrototypeBuild,REQUIRED_ATLASES } from '../scripts/prototype-input.js';
import { sha256 } from '../scripts/io.js';

type Manifest = Record<string,unknown> & {files:Record<string,string>;buildId:string};
let original:Manifest;
const bytes:Record<string,Buffer>={};
beforeAll(async()=>{
  original=JSON.parse(await readFile('docs/evidence/step-01/step01-ffc5300c7fb2cb94a48a/manifest.snapshot.json','utf8')) as Manifest;
  for (const family of ['diagnostic','art']) {
    const inputs=await Promise.all([`${family}-ground`,...[0,1,2].map(f=>`${family}-water-${f}`)]
      .map(async name=>decodePng(await readFile(`tests/fixtures/${name}.png`))));
    const {a1,a2}=compileFixedPrototype(inputs[0]!,inputs.slice(1));
    bytes[`${family}_A1.png`]=await encodePng(a1);bytes[`${family}_A2.png`]=await encodePng(a2);
  }
});
// Same published identity format. Tests deliberately sign altered metadata to exercise
// image validation beyond hash checks; expected dimensions/content come from independent assertions.
function reidentify(m:Manifest) {
  const {commit,profile,pixelContract,compiler,sources,lockSha256,node,encoder,files}=m;
  m.buildId=`step01-${sha256(JSON.stringify({commit,profile,pixelContract,compiler,sources,lockSha256,node,encoder,files})).slice(0,20)}`;
}
async function withInput(test:(dir:string,m:Manifest)=>Promise<void>) {
  const dir=await mkdtemp(join(tmpdir(),'tileset-preflight-'));
  const m=structuredClone(original);
  try {
    for(const name of REQUIRED_ATLASES) await writeFile(join(dir,name),bytes[name]!);
    await writeFile(join(dir,'manifest.json'),JSON.stringify(m));
    await test(dir,m);
  } finally { await rm(dir,{recursive:true,force:true}); }
}
const save = (dir:string,m:Manifest)=>writeFile(join(dir,'manifest.json'),JSON.stringify(m));
describe('P2-02: required atlas preflight',()=>{
  it('accepts the complete published build and caches its exact manifest and PNG bytes',async()=>withInput(async(dir,m)=>{
    const input=await preflightPrototypeBuild(dir);
    expect(input.manifest.buildId).toBe(original.buildId);
    expect(input.manifest.files).toEqual(m.files);
    expect(input.manifestSha256).toBe(sha256(await readFile(join(dir,'manifest.json'))));
    for (const name of REQUIRED_ATLASES) {
      expect(input.atlases[name]).toEqual(bytes[name]);
      expect(sha256(input.atlases[name])).toBe(m.files[name]);
    }
    // A later mutation of input paths cannot change what prepare writes.
    await writeFile(join(dir,'art_A1.png'),'changed after preflight');
    expect(input.atlases['art_A1.png']).toEqual(bytes['art_A1.png']);
  }));
  it.each(REQUIRED_ATLASES)('rejects a missing Manifest.files entry: %s',async name=>withInput(async(dir,m)=>{
    delete m.files[name];await save(dir,m);
    await expect(preflightPrototypeBuild(dir)).rejects.toThrow(`Manifest missing required atlas: ${name}`);
  }));
  it.each([{},null,[],true,'not an object'])('rejects empty or malformed files: %j',async files=>withInput(async(dir,m)=>{
    m['files']=files as Manifest['files'];await save(dir,m);
    await expect(preflightPrototypeBuild(dir)).rejects.toThrow(/Manifest\.files|missing required atlas/);
  }));
  it.each(REQUIRED_ATLASES)('rejects an unreadable/missing required PNG: %s',async name=>withInput(async(dir)=>{
    await unlink(join(dir,name));
    await expect(preflightPrototypeBuild(dir)).rejects.toThrow(`Cannot read required atlas: ${name}`);
  }));
  it('rejects a directory in place of a PNG',async()=>withInput(async(dir)=>{
    await unlink(join(dir,'art_A2.png'));await mkdir(join(dir,'art_A2.png'));
    await expect(preflightPrototypeBuild(dir)).rejects.toThrow('Cannot read required atlas: art_A2.png');
  }));
  it.each([null,42,'not-a-hash','a'.repeat(63)])('rejects malformed atlas SHA-256: %j',async hash=>withInput(async(dir,m)=>{
    m.files['art_A1.png']=hash as string;await save(dir,m);
    await expect(preflightPrototypeBuild(dir)).rejects.toThrow('Invalid SHA-256 for required atlas: art_A1.png');
  }));
  it('rejects changed bytes without changing the declared hash',async()=>withInput(async(dir)=>{
    await writeFile(join(dir,'art_A1.png'),'not a PNG');
    await expect(preflightPrototypeBuild(dir)).rejects.toThrow('Required atlas SHA-256 mismatch: art_A1.png');
  }));
  it('rejects invalid PNG even with a matching declared hash and new build identity',async()=>withInput(async(dir,m)=>{
    const invalid=Buffer.from('not a PNG');await writeFile(join(dir,'art_A1.png'),invalid);
    m.files['art_A1.png']=sha256(invalid);reidentify(m);await save(dir,m);
    await expect(preflightPrototypeBuild(dir)).rejects.toThrow('Invalid required atlas: art_A1.png');
  }));
  it('rejects valid RGBA8 PNG with incorrect atlas dimensions',async()=>withInput(async(dir,m)=>{
    const wrongSize=await encodePng(blank(48,48));await writeFile(join(dir,'art_A1.png'),wrongSize);
    m.files['art_A1.png']=sha256(wrongSize);reidentify(m);await save(dir,m);
    await expect(preflightPrototypeBuild(dir)).rejects.toThrow('Invalid required atlas: art_A1.png');
  }));
  it('rejects altered metadata that reuses the old build ID',async()=>withInput(async(dir,m)=>{
    m['commit']='f'.repeat(40);await save(dir,m);
    await expect(preflightPrototypeBuild(dir)).rejects.toThrow(/buildId does not match/);
  }));
  it('rejects undeclared extra/path atlas entries',async()=>withInput(async(dir,m)=>{
    m.files['../other.png']='f'.repeat(64);await save(dir,m);
    await expect(preflightPrototypeBuild(dir)).rejects.toThrow('Unexpected atlas in Manifest.files: ../other.png');
  }));
});
