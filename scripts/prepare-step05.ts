import { strict as assert } from 'node:assert';
import { cp, lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hashBytes } from '@tileset/asset-core';
import { loadNativeOracle } from './mz-oracle.js';
import { validateNativeEmptyPlugins } from './prototype-input.js';
import { jsonBytes, readPackExport } from './pack-export.js';

const [sourceArg,artBaseArg,artNextArg,diagBaseArg,diagNextArg,destArg]=process.argv.slice(2);
if(!sourceArg||!artBaseArg||!artNextArg||!diagBaseArg||!diagNextArg||!destArg)
  throw Error('Usage: pnpm prepare:step05 <existing handdrawn project> <art baseline> <art update> <diagnostic baseline> <diagnostic update> <new project copy>');
const source=resolve(sourceArg),destination=resolve(destArg),stage=`${destination}.stage-${process.pid}`,lock=`${destination}.lock`;
assert.ok(!destination.startsWith(source+'/') && destination !== source,'Destination must be separate from the original project.');
await loadNativeOracle(resolve(source,'js/rmmz_core.js'));validateNativeEmptyPlugins(await readFile(resolve(source,'js/plugins.js')));
const artBase=await readPackExport(artBaseArg),artNext=await readPackExport(artNextArg),diagBase=await readPackExport(diagBaseArg),diagNext=await readPackExport(diagNextArg);
const families=[{name:'art',id:2,baseline:artBase,next:artNext},{name:'diagnostic',id:1,baseline:diagBase,next:diagNext}];
const files: Record<string,Uint8Array>={},before:Record<string,string>={};
for(const name of ['Map001.json','Map002.json','Map003.json','Tilesets.json','System.json']) {
  const bytes=await readFile(resolve(source,'data',name));before[name]=hashBytes(bytes);files[name]=bytes;
}
const tilesets=JSON.parse(Buffer.from(files['Tilesets.json']!).toString()) as ({id:number;mode:number;tilesetNames:string[];flags:number[]}|null)[];
for(const family of families) {
  const t=tilesets[family.id]!;assert.equal(t.id,family.id);assert.equal(t.mode,1);
  assert.deepEqual(t.tilesetNames,[`${family.name}_A1`,`${family.name}_A2`,'','','','','','','']);
  assert.equal(family.next.input.snapshot.previousHash,family.baseline.input.snapshot.contentHash);
  for(const p of family.baseline.input.plan.placements) {
    const next=family.next.input.plan.placements.find(n=>n.atlas===p.atlas&&n.kind===p.kind)!;
    assert.equal(next.binding.logicalId,p.binding.logicalId);
    for(let shape=0;shape<48;shape++)assert.equal(t.flags[p.tileId+shape],p.atlas==='A1'?15:0);
  }
  for(const atlas of ['A1','A2'])assert.equal(hashBytes(await readFile(resolve(source,'img/tilesets',`${family.name}_${atlas}.png`))),family.baseline.manifest.identity.files[`${atlas}.png`]!.sha256,'Baseline Pack must reproduce the original installed atlas exactly.');
}
await mkdir(resolve(destination,'..'),{recursive:true});await mkdir(lock);
try {
  try {await lstat(destination);throw Error('Project copy already exists.');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  try {await lstat(stage);throw Error('Project staging directory already exists.');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  await cp(source,stage,{recursive:true,errorOnExist:true,force:false});
  for(const family of families)for(const atlas of ['A1','A2'])await writeFile(resolve(stage,'img/tilesets',`${family.name}_${atlas}.png`),family.next.files[`${atlas}.png`]!);
  const reference={sourceProject:source,sourceMaps:before,mapTileIds:'UNCHANGED_BYTE_FOR_BYTE',database:'UNCHANGED_BYTE_FOR_BYTE',
    builds:families.map(f=>({family:f.name,baseline:{buildId:f.baseline.manifest.buildId,manifestSha256:f.baseline.manifestSha256},updated:{buildId:f.next.manifest.buildId,manifestSha256:f.next.manifestSha256,atlasHashes:{A1:f.next.manifest.identity.files['A1.png']!.sha256,A2:f.next.manifest.identity.files['A2.png']!.sha256}}})),
    editorDrawing:'NOT_EXECUTED',gameRuntime:'NOT_EXECUTED',visual:'NOT_EXECUTED',nativeHost:'NOT_EXECUTED',
    note:'A new local copy of real user-handdrawn maps. Only installed atlas pixels replaced; no Tile ID migration. Old step04 reference describes historical source; this step05 reference describes replacement. Do not redistribute licensed runtime/RTP.'};
  await writeFile(resolve(stage,'step05-build-reference.json'),jsonBytes(reference),{flag:'wx'});
  for(const name of Object.keys(before)){assert.equal(hashBytes(await readFile(resolve(stage,'data',name))),before[name]);assert.equal(hashBytes(await readFile(resolve(source,'data',name))),before[name]);}
  for(const family of families)for(const atlas of ['A1','A2'])assert.equal(hashBytes(await readFile(resolve(stage,'img/tilesets',`${family.name}_${atlas}.png`))),family.next.manifest.identity.files[`${atlas}.png`]!.sha256);
  await rename(stage,destination);console.log(JSON.stringify({project:destination,reference},null,2));
} finally {await rm(stage,{force:true,recursive:true});await rm(lock,{force:true,recursive:true});}
