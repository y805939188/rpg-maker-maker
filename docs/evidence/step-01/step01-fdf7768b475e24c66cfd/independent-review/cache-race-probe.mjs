import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const base=path.dirname(new URL(import.meta.url).pathname);
const candidate=`${base}/candidate`,source=`${candidate}/artifacts/step01-fdf7768b475e24c66cfd`;
const template='/Users/dingshinn/Library/Application Support/Steam/steamapps/common/RPG Maker MZ/RPGMZ.app/Contents/Resources/newdata';
const cwd=`${base}/cached-input-race`,input=`${cwd}/input`;
await fs.mkdir(input,{recursive:true});await fs.cp(source,input,{recursive:true});
const manifest=JSON.parse(await fs.readFile(`${source}/manifest.json`,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifestHash=hash(await fs.readFile(`${input}/manifest.json`));
const project=`${cwd}/.local/mz/${manifest.buildId}`;
const child=spawn('/Users/dingshinn/.nvm/versions/node/v22.21.1/bin/node',[`${candidate}/dist/scripts/prepare-mz.js`,template,input],{cwd});
let stdout='',stderr='',finished=false,mutated=false;child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
const completion=new Promise(resolve=>child.on('exit',code=>{finished=true;resolve(code);}));
while(!finished){
 let exists=false;try{await fs.stat(project);exists=true;}catch{}
 if(exists){
  // prepare creates this directory only after preflight and native-core check.
  for(const name of Object.keys(manifest.files))await fs.writeFile(`${input}/${name}`,'mutated after destination mkdir');
  await fs.writeFile(`${input}/manifest.json`,'mutated after preflight');mutated=true;break;
 }
 await new Promise(resolve=>setTimeout(resolve,1));
}
const exitCode=await completion;await fs.writeFile(`${base}/cached-input-race.log`,stdout+stderr);
const copiedHashes={};for(const name of Object.keys(manifest.files))copiedHashes[name]=hash(await fs.readFile(`${project}/img/tilesets/${name}`));
const reference=JSON.parse(await fs.readFile(`${project}/step01-build-reference.json`,'utf8'));
const pass=mutated&&exitCode===0&&Object.keys(manifest.files).every(name=>copiedHashes[name]===manifest.files[name])&&reference.manifestSha256===manifestHash;
const result={mutatedAfterProjectCreation:mutated,exitCode,copiedHashes,manifestHash,referenceManifestHash:reference.manifestSha256,pass};
await fs.writeFile(`${base}/cached-input-race.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=pass?0:1;
