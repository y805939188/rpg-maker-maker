import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='.local/mz/step01-ffc5300c7fb2cb94a48a';
async function fingerprint(path){const hashes={};async function walk(p){for(const item of await readdir(p,{withFileTypes:true})){const name=join(p,item.name);if(item.isDirectory())await walk(name);else hashes[name]=createHash('sha256').update(await readFile(name)).digest('hex');}}await walk(path);return hashes;}
const before=await fingerprint(root);
const result=spawnSync(process.execPath,['dist/scripts/prepare-mz.js','/Users/dingshinn/Library/Application Support/Steam/steamapps/common/RPG Maker MZ/RPGMZ.app/Contents/Resources/newdata','artifacts/step01-ffc5300c7fb2cb94a48a'],{encoding:'utf8'});
const after=await fingerprint(root);
const changes=Object.keys(before).filter(name=>before[name]!==after[name]);
const summary={status:result.status,stderr:result.stderr,filesBefore:Object.keys(before).length,filesAfter:Object.keys(after).length,changes,protection:result.status!==0&&changes.length===0&&Object.keys(before).length===Object.keys(after).length?'PASS':'FAIL'};
await writeFile('.local/reviewer/project-protection-301d3cd.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
