import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const candidate=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base='artifacts/step05-suite-'+candidate.slice(0,12);
const approved=JSON.parse(await readFile('docs/evidence/step-05/fix-ir001-ad669a06218b/build-suite.json','utf8')),rows=[];
for(const build of approved.builds)for(const [name,file]of Object.entries(build.files)){
 const bytes=await readFile(base+'/'+build.name+'/'+name),sha256=createHash('sha256').update(bytes).digest('hex');
 assert.equal(bytes.length,file.bytes);assert.equal(sha256,file.sha256);rows.push({pack:build.name,file:name,sha256,bytes:bytes.length});
}
assert.equal(rows.length,56);
await writeFile('.local/step06/fix-round2/pack-regression.json',JSON.stringify({candidate,payloads:rows.length,png:rows.filter(r=>r.file.endsWith('.png')).length,matchesApprovedStep05:true,approvedEvidence:'docs/evidence/step-05/fix-ir001-ad669a06218b/build-suite.json',rows},null,2)+'\n');
console.log('56 payloads/16PNG matched approved step05 across8packs');
