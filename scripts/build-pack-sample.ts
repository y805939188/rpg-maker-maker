import { lstat, mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hashBytes } from '@tileset/asset-core';
import { planPack } from '@tileset/pack-assembly';
import { makeCompilerFixture } from './step04-fixture.js';
import { fragmentsFor, pairOperations, variantFixture } from './step05-fixture.js';
import { archiveFixture, assembleExport, currentBuildContext, jsonBytes, publishDirectory, readPackExport } from './pack-export.js';
import type { RecipeArchive } from './pack-export.js';
import type { Operation, PackSnapshot } from '@tileset/pack-assembly';
import { PROFILE } from '../src/profile.js';
import { git } from './io.js';

if(git('status','--porcelain','--untracked-files=all'))throw Error('Commit the candidate before publishing step05 samples.');
const context=await currentBuildContext(git('rev-parse','HEAD'),hashBytes(await readFile('pnpm-lock.yaml')));
const base=resolve('artifacts',`step05-suite-${context.commit.slice(0,12)}`);
const stage=base+`.stage-${process.pid}`,lock=base+'.lock';
await mkdir(resolve('artifacts'),{recursive:true});await mkdir(lock);
try {
try {await lstat(base);throw Error('Immutable suite already exists.');}catch(e){if((e as NodeJS.ErrnoException).code !== 'ENOENT')throw e;}
await mkdir(stage);
const index: unknown[] = [];
async function emit(name:string,operations:Operation[],history:readonly PackSnapshot[],archives:readonly RecipeArchive[],fragments:ReturnType<typeof fragmentsFor>[number][],packId:string) {
  const build=planPack(PROFILE,{packId,version:history.length+1,operations},history,fragments);
  const result=await assembleExport({...build,archives},context),target=resolve(stage,name);
  await publishDirectory(target,result.files,readPackExport);
  const request={packId,version:build.snapshot.version,operations,history,archives};
  await writeFile(resolve(stage,`${name}.request.json`),jsonBytes(request),{flag:'wx'});
  index.push({name,path:resolve(base,name),buildId:result.manifest.buildId,manifestSha256:hashBytes(result.files['manifest.json']!),files:result.manifest.identity.files});
  return build;
}
const art=await makeCompilerFixture('art'),original=fragmentsFor(art),variant=await variantFixture(art,'new-set',1,true),other=fragmentsFor(variant),updated=await variantFixture(art,'art',2,true),update=fragmentsFor(updated);
const archives=[archiveFixture(art),archiveFixture(variant),archiveFixture(updated)],fragments=[...original,...other,...update];
const first=await emit('incremental-v1',pairOperations('a',1,original),[],archives,fragments,'incremental');
const second=await emit('incremental-v2',pairOperations('b',1,other),[first.snapshot],archives,fragments,'incremental');
const third=await emit('incremental-v3',pairOperations('a',2,update),[first.snapshot,second.snapshot],archives,fragments,'incremental');
await emit('incremental-v4',[{operation:'retire',logicalId:'b-ground'},{operation:'retire',logicalId:'b-water'}],[first.snapshot,second.snapshot,third.snapshot],archives,fragments,'incremental');
for(const family of ['art','diagnostic'] as const) {
  const f=family==='art'?art:await makeCompilerFixture('diagnostic'),old=fragmentsFor(f),n=family==='art'?updated:await variantFixture(f,'diagnostic',2,true),next=fragmentsFor(n),all=[...old,...next],records=[archiveFixture(f),archiveFixture(n)];
  const v1=await emit(`${family}-old-map-v1`,[...pairOperations('a',1,old),...pairOperations('b',1,old)],[],records,all,`${family}-old-map`);
  await emit(`${family}-old-map-v2`,[...pairOperations('a',2,next),{operation:'retire',logicalId:'b-ground'},{operation:'retire',logicalId:'b-water'}],[v1.snapshot],records,all,`${family}-old-map`);
  try { planPack(PROFILE,{packId:`${family}-old-map`,version:2,operations:pairOperations('c',1,old)},[v1.snapshot],all);throw Error('capacity probe unexpectedly passed'); }
  catch(e) { if(!(e instanceof Error) || !e.message.includes('NEVER_USED'))throw e; }
}
await writeFile(resolve(stage,'index.json'),jsonBytes({commit:context.commit,builds:index,capacityProbe:'PASS_REJECTED_NO_NEVER_USED_SLOTS'}),{flag:'wx'});
await rename(stage,base);
console.log(JSON.stringify({path:base,builds:index},null,2));
} finally {await rm(stage,{recursive:true,force:true});await rm(lock,{recursive:true,force:true});}
