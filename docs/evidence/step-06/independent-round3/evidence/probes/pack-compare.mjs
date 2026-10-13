import {assert,root,resolve,readFile,record,candidate} from './common.mjs';
import {hashBytes} from '@tileset/asset-core';
import {readPackExport} from '../../dist/scripts/pack-export.js';
const base=resolve(root,'standard-packs','step05-suite-'+candidate.slice(0,12)),suite=JSON.parse(await readFile(resolve(base,'index.json'),'utf8'));const rows=[];
for(const build of suite.builds){const actual=await readPackExport(resolve(base,build.name)),approved=JSON.parse(await readFile(resolve('docs/evidence/step-05/coding/packs',build.name,'manifest.json'),'utf8'));for(const [file,ref] of Object.entries(approved.identity.files)){const bytes=actual.files[file];assert.equal(hashBytes(bytes),ref.sha256,build.name+'/'+file);assert.equal(bytes.length,ref.bytes);rows.push({pack:build.name,file,sha256:hashBytes(bytes),bytes:bytes.length});}}
assert.equal(rows.length,56);await record('pack-regression',{candidate,packs:8,payloads:rows.length,png:rows.filter(r=>r.file.endsWith('.png')).length,approvedReference:'docs/evidence/step-05/coding/packs/*/manifest.json',unchanged:true,rows});console.log('56 standard payload hashes / 16 PNG match approved step05');
