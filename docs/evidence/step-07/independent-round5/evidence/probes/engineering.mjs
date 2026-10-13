import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=execFileSync('git',['show','5c3361b9cb28a49c7cbdcabf28f03c8eba470d6d:docs/evidence/step-07/fix-round4/engineering-manifest.json']);
assert.equal(sha(bytes),'35fdc32783b4a07aff8a12bc3531385cc2dcb399f54d18da5fac1bdddd507814');
const m=JSON.parse(bytes),rows=[];
for(const [path,hash]of Object.entries(m.files)){const b=await readFile(path);assert.equal(sha(b),hash,path);rows.push({path,sha256:sha(b),bytes:b.length});}
const {buildId,validation,note,...identity}=m;const actual='step07-'+identity.commit.slice(0,12)+'-'+sha(JSON.stringify(identity)).slice(0,16);assert.equal(actual,buildId);assert.equal(identity.commit,'59423201ba10ee71c3d1b04cebec69659017b7c7');
await writeFile('.local/step07-review/evidence/engineering-verification.json',JSON.stringify({buildId,manifestSha256:sha(bytes),count:rows.length,independentIdentity:actual,rows},null,2)+'\n');console.log('PASS fresh engineering '+rows.length+' files '+buildId);
