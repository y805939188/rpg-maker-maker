import assert from 'node:assert/strict';
import {AssetStorage,verifyBackup} from '@tileset/persistence';
import {hashBytes} from '@tileset/asset-core';
import {mkdir,mkdtemp,cp,rename,symlink,readFile,writeFile,readdir,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=resolve('.local/step07-review/private/extra-storage');await mkdir(base,{recursive:true});
const bytes=new TextEncoder().encode('R2 independent original immutable resource'),rows=[];
for(const kind of ['owner','root','objects','builds','build','object-leaf','build-leaf','stage']){
 const parent=await mkdtemp(base+'/case-'),root=resolve(parent,'owner/assets'),s=new AssetStorage(root),ref=await s.put(bytes),build='c'.repeat(64);await s.publish(build,{'bundle.json':bytes},async f=>assert.deepEqual(f['bundle.json'],bytes));
 const path={owner:resolve(parent,'owner'),root,objects:root+'/objects',builds:root+'/builds',build:root+'/builds/'+build,'object-leaf':s.path(ref.key),'build-leaf':root+'/builds/'+build+'/bundle.json',stage:root+'/stage'}[kind];
 const outside=parent+'/same-byte-outside',old=path+'-kept';await cp(path,outside,{recursive:true});await rename(path,old);await symlink(outside,path);
 try {if(['owner','root','objects','object-leaf'].includes(kind))await assert.rejects(s.read(ref));if(['owner','root','builds','build','build-leaf'].includes(kind))await assert.rejects(s.buildFiles(build));if(['owner','root','objects','builds','stage'].includes(kind))await assert.rejects(s.put(Buffer.from('new'),true));}
 finally{await rename(path,parent+'/retained-link');await rename(old,path)}
 assert.deepEqual(await s.read(ref),bytes);assert.deepEqual((await s.buildFiles(build))['bundle.json'],bytes);rows.push({kind,result:'REJECTED_AND_NORMAL_CONTROL_PASSED'});
}
const parent=await mkdtemp(base+'/identity-'),root=parent+'/owner/assets',s=new AssetStorage(root),ref=await s.put(bytes),old=root+'-kept',replacement=parent+'/copy';await cp(root,replacement,{recursive:true});await rename(root,old);await assert.rejects(s.read(ref));await assert.rejects(s.put(bytes));await rename(replacement,root);await assert.rejects(s.read(ref));await rename(root,replacement);await rename(old,root);assert.deepEqual(await s.read(ref),bytes);rows.push({kind:'same-content-root-replacement-and-disappearance',result:'REJECTED_AND_RECOVERED'});
let moved=false;const outside=parent+'/fd-outside';await cp(root+'/objects',outside,{recursive:true});const guarded=new AssetStorage(root,async point=>{if(point==='storage-file-read'&&!moved){moved=true;await rename(root+'/objects',root+'/objects-kept');await symlink(outside,root+'/objects')}});
try{await assert.rejects(guarded.read(ref));assert(moved)}finally{await rename(root+'/objects',parent+'/fd-retained-link');await rename(root+'/objects-kept',root+'/objects')};assert.deepEqual(await guarded.read(ref),bytes);rows.push({kind:'fd-open-then-observable-ancestor-change',result:'REJECTED_NO_BYTES_RETURNED_NORMAL_RESTORED'});
await writeFile('.local/step07-review/evidence/storage-extra.json',JSON.stringify({rows,limits:'Cooperative observable boundaries; no hostile administrator ABA/openat claim',scope:'byte/file controls only; HTTP PNG/Build and true PG backup separately'},null,2)+'\n');console.log('PASS independent '+rows.length+' storage controls');
