import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import ts from '../../../../node_modules/typescript/lib/typescript.js';
const root=process.cwd(),r=root+'/.local/step07-review';
const oldSource=execFileSync('git',['show','f5740c1fd0e9e22a4f4676de51b7fd2555bc05a5:apps/api/tests/studio/integration.test.ts'],{encoding:'utf8'});
const crc=oldSource.slice(oldSource.indexOf('function crc('),oldSource.indexOf('function chunk('));
const old=oldSource.slice(oldSource.indexOf('function r4DownloadedFiles('),oldSource.indexOf("it('R4 real COMMIT first/update/history snapshots"));
const shim=`const expect = (actual) => ({toBe:expected=>assert.equal(actual,expected),toBeUndefined:()=>assert.equal(actual,undefined),toEqual:expected=>assert.deepEqual(actual,expected)});`;
const oldJS=ts.transpileModule(crc+old+'\nexport {r4DownloadedFiles};',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const oldReader=(await import('data:text/javascript;base64,'+Buffer.from("import assert from 'node:assert/strict';\n"+shim+oldJS).toString('base64'))).r4DownloadedFiles;
const latestSrc=await fs.readFile(root+'/apps/api/tests/studio/stored-zip.ts','utf8');
const latestJS=ts.transpileModule(latestSrc,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const latest=(await import('data:text/javascript;base64,'+Buffer.from(latestJS).toString('base64'))).readStoredStandardZip;
const rows=JSON.parse(await fs.readFile(r+'/evidence/python-zip-controls.json','utf8'));const results=[];
for(const row of rows){
 const bytes=await fs.readFile(r+'/'+row.file);let oldAccept=true,newAccept=true,oldError,newError;
 try{oldReader(bytes);}catch(e){oldAccept=false;oldError=e.message;}
 try{latest(bytes);}catch(e){newAccept=false;newError=e.message;}
 assert.equal(newAccept,row.expectedAccepted,row.case);
 results.push({...row,oldHelperAccepted:oldAccept,newHelperAccepted:newAccept,oldError,newError});
}
const hash=b=>createHash('sha256').update(b).digest('hex');
await fs.writeFile(r+'/evidence/reader-negative-comparison.json',JSON.stringify({source:'c8d41a680df42fe565882d93d3f85a04f7a10b22',oldSource:'f5740c1fd0e9e22a4f4676de51b7fd2555bc05a5',oldHelperSHA256:hash(old),newHelperSHA256:hash(latestSrc),substitution:'old exact helper/CRC plus equivalent node:assert comparisons; new exact transpiled helper',rows:results},null,2)+'\n');
console.log(JSON.stringify({controls:results.length,normalAccepted:results.filter(x=>x.newHelperAccepted).length,badRejected:results.filter(x=>!x.newHelperAccepted).length,originalR7Pairs:results.filter(x=>x.case==='r7-original-bad').map(x=>({pair:x.pair,oldAccepted:x.oldHelperAccepted,newAccepted:x.newHelperAccepted})),originalHoleCases:results.filter(x=>x.pair===0&&['central-crc','central-name','eocd-count','local-crc','payload'].includes(x.case)).map(x=>({case:x.case,oldAccepted:x.oldHelperAccepted,newAccepted:x.newHelperAccepted}))}));
