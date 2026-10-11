import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
const root='artifacts/step01-ffc5300c7fb2cb94a48a';
async function files(){const hashes={};for(const item of await readdir(root))hashes[item]=createHash('sha256').update(await readFile(join(root,item))).digest('hex');return hashes;}
const before=await files(),trials=[];
for(let trial=0;trial<3;trial++){
 const r=spawnSync('pnpm',['prototype'],{encoding:'utf8'});
 trials.push({trial,status:r.status,expectedImmutableRefusal:r.status!==0&&r.stderr.includes('Immutable build already exists:')&&r.stderr.includes('step01-ffc5300c7fb2cb94a48a'),stdout:r.stdout,stderr:r.stderr});
}
const after=await files();
const rootItems=await readdir('artifacts');
const result={buildId:'step01-ffc5300c7fb2cb94a48a',before,after,unchanged:JSON.stringify(before)===JSON.stringify(after),trials,staleLocksOrStages:rootItems.filter(x=>x.startsWith('.lock-')||x.startsWith('.stage-'))};
await writeFile('.local/reviewer/rebuild-301d3cd.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
