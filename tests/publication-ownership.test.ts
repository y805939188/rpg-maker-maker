import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { PROFILE } from '../src/profile.js';

const root = process.cwd(), commit = 'a'.repeat(40), sentinel = 'pre-existing unrelated data';
type Entry = 'publisher' | 'suite' | 'prepare' | 'engineering';
const entries: Entry[] = ['publisher','suite','prepare','engineering'];
let temp: string, wrapper: string;
beforeAll(async()=>{
  temp=await mkdtemp(join(tmpdir(),'step05-ownership-'));wrapper=join(temp,'child.mjs');
  // Gate before importing the real production JS: collision setup never races child startup.
  // Mock only Git identity and prepare's separately-tested read-only preflight dependencies.
  await writeFile(wrapper,`
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {basename,dirname} from 'node:path';
import fs from 'node:fs/promises';
import cp from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
const [kind,entry,target,mode,...args]=process.argv.slice(2);
const realExec=cp.execFileSync;
cp.execFileSync=(file,argv,options)=>file==='git'?(argv[0]==='status'?'':${JSON.stringify(commit)}):realExec(file,argv,options);
const realWrite=fs.writeFile,realRename=fs.rename;
if(mode==='write-failure')fs.writeFile=async(path,...rest)=>{
 if(String(path).endsWith('/manifest.json'))throw Error('synthetic manifest write failure');
 return realWrite(path,...rest);
};
if(mode==='reoccupied-after-rename')fs.rename=async(source,destination)=>{
 await realRename(source,destination);
 if(basename(String(destination))===basename(target)&&await fs.realpath(dirname(String(destination)))===await fs.realpath(dirname(target))){await fs.mkdir(source);await realWrite(source+'/unrelated.txt',${JSON.stringify(sentinel)});}
};
syncBuiltinESMExports();
process.argv=[process.execPath,entry,...args];
process.send({pid:process.pid});await once(process,'message');process.disconnect();
if(kind==='publisher'){
 const {publishDirectory}=await import(pathToFileURL(entry));
 await publishDirectory(target,{'payload.txt':new TextEncoder().encode('new success')},async()=>{
  if(mode==='verify-failure')throw Error('synthetic verify failure');
 });
}else await import(pathToFileURL(entry));
`);
});
afterAll(async()=>{await rm(temp,{recursive:true,force:true});});
const sha=(bytes: Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
interface Fixture { cwd:string; entry:string; target:string; args:string[]; stage:(pid:number)=>string; lock:string }
async function fixture(kind:Entry,label:string):Promise<Fixture> {
  const cwd=join(temp,label);await mkdir(cwd);
  let entry=resolve(root,'dist/scripts/pack-export.js'),target=join(cwd,'export'),args:string[]=[];
  let stage=(pid:number)=>`${target}.stage-${pid}`,lock=`${target}.lock`;
  if(kind==='suite') {
    entry=resolve(root,'dist/scripts/build-pack-sample.js');target=join(cwd,'artifacts','step05-suite-'+commit.slice(0,12));
    await writeFile(join(cwd,'pnpm-lock.yaml'),'synthetic lock');
  } else if(kind==='engineering') {
    // Minimal regular build payloads; the real engineering script still computes its identity,
    // writes files/manifest and publishes. No private env or application/database startup.
    for(const dir of ['dist','packages/contracts/dist','packages/ai-gateway/dist','packages/asset-core/dist','packages/material-processing/dist','packages/image-adapter/dist','packages/mz-compiler/dist','packages/pack-assembly/dist','apps/api/dist','apps/web/dist']) {
      await mkdir(join(cwd,dir),{recursive:true});await writeFile(join(cwd,dir,'payload.js'),'regular build bytes');
    }
    await mkdir(join(cwd,'scripts'));await mkdir(join(cwd,'dist/src'));
    await writeFile(join(cwd,'dist/src/profile.js'),await readFile(join(root,'dist/src/profile.js')));
    entry=join(cwd,'scripts/build-engineering.mjs');await writeFile(entry,await readFile(join(root,'scripts/build-engineering.mjs')));
    await writeFile(join(cwd,'pnpm-lock.yaml'),'synthetic lock');args=['step05'];
    // First ordinary publication gives the script's own Build ID; no duplicated identity formula.
    const first=await run({cwd,entry,target:'unused',args,stage:()=>'',lock:''},'engineering','normal',async()=>{});
    expect(first.code).toBe(0);const result=JSON.parse(first.output);
    target=join(cwd,'artifacts',result.buildId);await rm(target,{recursive:true});
    stage=(pid:number)=>join(cwd,'artifacts',`.stage-${result.buildId}-${pid}`);lock=join(cwd,'artifacts',`.lock-${result.buildId}`);
  } else if(kind==='prepare') {
    // Ownership regression only. Synthetic read-only preflight outputs keep CI independent
    // of licensed MZ files; the actual prepare script's filesystem/copy/write path is unchanged.
    await mkdir(join(cwd,'scripts'));await symlink(join(root,'node_modules'),join(cwd,'node_modules'),'dir');
    entry=join(cwd,'scripts/prepare-step05.mjs');await writeFile(entry,await readFile(join(root,'dist/scripts/prepare-step05.js')));
    await writeFile(join(cwd,'scripts/mz-oracle.js'),'export async function loadNativeOracle(){}');
    await writeFile(join(cwd,'scripts/prototype-input.js'),'export function validateNativeEmptyPlugins(){}');
    const source=join(cwd,'source');await mkdir(join(source,'data'),{recursive:true});await mkdir(join(source,'js'));await mkdir(join(source,'img/tilesets'),{recursive:true});
    await writeFile(join(source,'js/plugins.js'),'synthetic empty plugins');
    const files:Record<string,Uint8Array>={},bundles:Record<string,unknown>={};
    const flags=Array<number>(8192).fill(15);flags[0]=16;
    for(const slot of PROFILE.groundSlots)for(let s=0;s<48;s++)flags[slot.tileId+s]=0;
    await writeFile(join(source,'data/Tilesets.json'),JSON.stringify([null,...['diagnostic','art'].map((name,i)=>({id:i+1,mode:1,flags,tilesetNames:[name+'_A1',name+'_A2','','','','','','','']}))]));
    for(const name of ['Map001.json','Map002.json','Map003.json','System.json'])await writeFile(join(source,'data',name),'unchanged source data');
    for(const family of ['art','diagnostic']) {
      const oldFiles:Record<string,{sha256:string}>={};
      for(const atlas of ['A1','A2']) {
        const old=new TextEncoder().encode(`${family}-${atlas}-baseline`),next=new TextEncoder().encode(`${family}-${atlas}-updated`);
        await writeFile(join(source,'img/tilesets',`${family}_${atlas}.png`),old);oldFiles[atlas+'.png']={sha256:sha(old)};files[atlas+'.png']=next;
      }
      const placements=[...PROFILE.waterSlots.map(s=>({...s,atlas:'A1',binding:{logicalId:'water-'+s.kind}})),...PROFILE.groundSlots.map(s=>({...s,atlas:'A2',binding:{logicalId:'grass-'+s.kind}}))];
      const baseline={input:{snapshot:{contentHash:family+'-baseline'},plan:{placements}},manifest:{buildId:family+'-old',identity:{files:oldFiles}},manifestSha256:'baseline'};
      const next={input:{snapshot:{previousHash:family+'-baseline'},plan:{placements}},manifest:{buildId:family+'-new',identity:{files:Object.fromEntries(Object.entries(files).map(([n,b])=>[n,{sha256:sha(b)}]))}},manifestSha256:'updated',files:Object.fromEntries(Object.entries(files).map(([n,b])=>[n,[...b]]))};
      bundles[family+'-base']=baseline;bundles[family+'-next']=next;
    }
    await writeFile(join(cwd,'scripts/pack-export.js'),`const bundles=${JSON.stringify(bundles)};export async function readPackExport(key){const b=bundles[key];if(b.files)b.files=Object.fromEntries(Object.entries(b.files).map(([n,v])=>[n,new Uint8Array(v)]));return b;}export const jsonBytes=v=>new TextEncoder().encode(JSON.stringify(v));`);
    target=join(cwd,'new-project');args=[source,'art-base','art-next','diagnostic-base','diagnostic-next',target];
  }
  if(kind!=='engineering'){stage=(pid:number)=>`${target}.stage-${pid}`;lock=target+'.lock';}
  await mkdir(dirname(target),{recursive:true});return {cwd,entry,target,args,stage,lock};
}
async function run(f:Fixture,kind:Entry,mode:string,setup:(pid:number)=>Promise<void>) {
  const child=fork(wrapper,[kind,f.entry,f.target,mode,...f.args],{cwd:f.cwd,execArgv:[],silent:true});
  let output='';child.stdout!.on('data',b=>output+=b);child.stderr!.on('data',b=>output+=b);
  const completed=new Promise<{code:number|null;output:string}>((resolve,reject)=>{
    child.once('error',reject);child.once('exit',code=>resolve({code,output}));
  });
  const deadline=setTimeout(()=>child.kill('SIGKILL'),12000);
  try {
    const ready=await new Promise<number>((resolve,reject)=>{
      child.once('message',m=>resolve((m as {pid:number}).pid));child.once('error',reject);child.once('exit',()=>reject(Error('Child exited before gate')));
    });
    await setup(ready);child.send('go');return {...await completed,pid:ready};
  } finally {clearTimeout(deadline);if(child.exitCode===null)child.kill('SIGKILL');}
}
describe('STEP05-IR-001: ownership of staging directories in all four entry points',()=>{
  for(const kind of entries) {
    it.each([false,true])(`${kind}: preserves an unowned stage, existing target=%s`,async existing=>{
      const f=await fixture(kind,kind+'-'+existing);
      if(existing){await mkdir(f.target);await writeFile(join(f.target,'old-success.txt'),sentinel);}
      const result=await run(f,kind,'normal',async pid=>{await mkdir(f.stage(pid));await writeFile(join(f.stage(pid),'unrelated.txt'),sentinel);});
      expect(result.code).not.toBe(0);expect(result.output).toMatch(existing?/already exists/:/EEXIST|staging directory already exists/);expect(await readFile(join(f.stage(result.pid),'unrelated.txt'),'utf8')).toBe(sentinel);
      if(existing)expect(await readFile(join(f.target,'old-success.txt'),'utf8')).toBe(sentinel);
      else await expect(readFile(join(f.target,'old-success.txt'))).rejects.toMatchObject({code:'ENOENT'});
      await expect(readdir(f.lock)).rejects.toMatchObject({code:'ENOENT'});
    });
    it(`${kind}: cleans its own partially written stage on processing failure`,async()=>{
      const f=await fixture(kind,kind+'-owned-failure');
      if(kind==='prepare')await writeFile(join(f.args[0]!,'step05-build-reference.json'),sentinel); // wx conflict after real copy and atlas writes
      const mode=kind==='publisher'?'verify-failure':kind==='engineering'?'write-failure':'normal';
      const result=await run(f,kind,mode,async()=>{});expect(result.code).not.toBe(0);
      expect(result.output).toMatch(kind==='publisher'?/synthetic verify failure/:kind==='engineering'?/synthetic manifest write failure/:kind==='prepare'?/step05-build-reference\.json/:/ENOENT.*art-ground\.png/);
      await expect(readdir(f.stage(result.pid))).rejects.toMatchObject({code:'ENOENT'});await expect(readdir(f.target)).rejects.toMatchObject({code:'ENOENT'});await expect(readdir(f.lock)).rejects.toMatchObject({code:'ENOENT'});
      if(kind==='prepare')expect(await readFile(join(f.args[0]!,'step05-build-reference.json'),'utf8')).toBe(sentinel);
    });
  }
  it.each(['publisher','prepare','engineering'] as const)('%s: does not clean a path reoccupied after successful rename',async kind=>{
    const f=await fixture(kind,kind+'-renamed'),result=await run(f,kind,'reoccupied-after-rename',async()=>{});
    expect(result.code).toBe(0);expect(await readFile(join(f.stage(result.pid),'unrelated.txt'),'utf8')).toBe(sentinel);await expect(readdir(f.lock)).rejects.toMatchObject({code:'ENOENT'});
    expect((await readdir(f.target)).length).toBeGreaterThan(0);
  });
});
