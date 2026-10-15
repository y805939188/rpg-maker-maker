import { spawn } from 'node:child_process';
import { mkdir,writeFile,readFile,cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const root=process.cwd(), out=resolve('.local/step07-review/independent-round18');
process.loadEnvFile(resolve('.env'));
const db=new URL(process.env.DATABASE_URL);
if(db.port!=='55519'||db.pathname!=='/tileset_studio'||process.env.API_PORT!=='4419'||process.env.WEB_PORT!=='5319')throw Error('own configuration mismatch');
process.env.PATH='/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:'+process.env.PATH;
process.env.NO_PROXY=process.env.no_proxy='127.0.0.1,localhost';
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('.local/step07-review/browser-cache');
process.env.STEP07_TEST_API_PORT='4419';
const label=process.argv[2], args=JSON.parse(process.argv[3]);
if(label.includes('dev'))process.env.E2E_MODE='dev';else delete process.env.E2E_MODE;
process.env.CONTROL_LABEL=label;
const executionRoot=label.includes('-full') ? JSON.parse(await readFile(resolve(out,'mirror.json'),'utf8')).mirror : root;
if(label.includes('-full')) {db.pathname='/tileset_r18_exec';process.env.DATABASE_URL=db.toString();}
process.env.TILESET_ASSET_ROOT=resolve(executionRoot,'.local/step07-review/assets');
const dir=resolve(out,'evidence',label);await mkdir(dir,{recursive:true});
const start=Date.now(); const chunks=[];
const child=spawn('pnpm',args,{cwd:executionRoot,env:process.env,stdio:['ignore','pipe','pipe']});
for(const stream of [child.stdout,child.stderr]) stream.on('data',b=>chunks.push(b));
child.on('error',e=>{throw e;});
const code=await new Promise(r=>child.on('exit',(c,s)=>r({exit:c,signal:s})));
const log=Buffer.concat(chunks);await writeFile(resolve(dir,'command.log.txt'),log);
const receipt={label,argv:['pnpm',...args],...code,seconds:(Date.now()-start)/1000,node:process.version,source:'d0a6f162a2b57634f7f10d0f5c49eab2168bb6a8',noProxyChildOnly:true,logSHA256:createHash('sha256').update(log).digest('hex'),logBytes:log.length};
if(args.includes('test') && !label.startsWith('control')){
 const mode=process.env.E2E_MODE==='dev'?'dev':'production';
 for(const [from,to] of [[`.local/e2e/${mode}.json`,'playwright.json'],[`.local/step07/browser/${mode}/r4-project-list`,'test-evidence']]){
  try{await cp(resolve(executionRoot,from),resolve(dir,to),{recursive:true,errorOnExist:true,force:false});}catch(e){if(e.code!=='ENOENT')throw e;}
 }
}
if(label.startsWith('control') && label.includes('-full')) await cp(resolve(executionRoot,'.local/step07-review/independent-round18/evidence',label),dir,{recursive:true,force:false}).catch(e=>{if(e.code!=='ENOENT')throw e;});
await writeFile(resolve(dir,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));console.log(log.toString().slice(-4000));
