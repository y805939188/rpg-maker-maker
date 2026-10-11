import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const base=path.dirname(new URL(import.meta.url).pathname);
const candidate=`${base}/candidate`,old=`${base}/old-301d3cd`;
const template='/Users/dingshinn/Library/Application Support/Steam/steamapps/common/RPG Maker MZ/RPGMZ.app/Contents/Resources/newdata';
const build=`${candidate}/artifacts/step01-fdf7768b475e24c66cfd`;
const original=JSON.parse(await fs.readFile(`${build}/manifest.json`,'utf8'));
const atlases=Object.keys(original.files);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const {encodePng,blank}=await import(pathToFileURL(`${candidate}/dist/src/pixels.js`));
const wrongSize=await encodePng(blank(96,144));
function identify(m){const {commit,profile,pixelContract,compiler,sources,lockSha256,node,encoder,files}=m;m.buildId='step01-'+hash(JSON.stringify({commit,profile,pixelContract,compiler,sources,lockSha256,node,encoder,files})).slice(0,20);}
const variants=[];
for(const name of atlases){
 variants.push({label:'missing-entry-'+name,alter:async(m,dir)=>{delete m.files[name];await fs.unlink(`${dir}/${name}`);}});
 variants.push({label:'missing-png-'+name,alter:async(m,dir)=>fs.unlink(`${dir}/${name}`)});
}
for(const [label,files] of [['empty-files',{}],['null-files',null],['array-files',[]],['number-files',42],['string-files','oops']])variants.push({label,alter:async m=>{m.files=files;}});
for(const [label,root] of [['null-manifest',null],['array-manifest',[]],['string-manifest','oops'],['empty-manifest',{}]])variants.push({label,alter:async()=>{},root});
for(const [label,field,value] of [['invalid-commit','commit','short'],['invalid-build-id','buildId','../escape'],['missing-sources','sources',null],['array-encoder','encoder',[]],['invalid-lock','lockSha256','bad'],['nonstring-node','node',22],['wrong-contract','pixelContract','bad'],['wrong-compiler','compiler','bad']])variants.push({label,alter:async m=>{m[field]=value;}});
variants.push({label:'altered-profile',alter:async m=>{m.profile.tileSize=24;}});
variants.push({label:'altered-identity-old-id',alter:async m=>{m.commit='f'.repeat(40);}});
variants.push({label:'extra-path-entry',alter:async m=>{m.files['../extra.png']='f'.repeat(64);}});
variants.push({label:'malformed-hash',alter:async m=>{m.files['art_A1.png']='g'.repeat(64);}});
variants.push({label:'bytes-hash-mismatch',alter:async(m,dir)=>fs.writeFile(`${dir}/art_A1.png`,'not png')});
variants.push({label:'matching-hash-nonpng',alter:async(m,dir)=>{const b=Buffer.from('not a PNG');await fs.writeFile(`${dir}/art_A1.png`,b);m.files['art_A1.png']=hash(b);identify(m);}});
variants.push({label:'matching-hash-wrong-dimensions',alter:async(m,dir)=>{await fs.writeFile(`${dir}/art_A1.png`,wrongSize);m.files['art_A1.png']=hash(wrongSize);identify(m);}});
variants.push({label:'matching-hash-bad-png-crc',alter:async(m,dir)=>{const b=await fs.readFile(`${dir}/art_A1.png`);b[b.length-1]^=1;await fs.writeFile(`${dir}/art_A1.png`,b);m.files['art_A1.png']=hash(b);identify(m);}});
variants.push({label:'directory-png',alter:async(m,dir)=>{await fs.unlink(`${dir}/art_A1.png`);await fs.mkdir(`${dir}/art_A1.png`);}});
variants.push({label:'missing-manifest',alter:async()=>{},omitManifest:true});
variants.push({label:'invalid-json',alter:async()=>{},rawManifest:'{broken'});
const exists=async file=>{try{await fs.stat(file);return true;}catch{return false;}};
async function ledger(dir){const result={};async function visit(current,rel=''){for(const item of await fs.readdir(current,{withFileTypes:true})){const name=path.join(rel,item.name),full=path.join(current,item.name);if(item.isDirectory())await visit(full,name);else result[name]=hash(await fs.readFile(full));}}await visit(dir);return result;}
const results=[];
async function run(v,implementation,existing){
 const label=path.basename(implementation)+'-'+v.label+(existing?'-existing':'-absent');
 const cwd=`${base}/cli-cases/${label}`,input=`${cwd}/input`;await fs.mkdir(input,{recursive:true});
 for(const name of atlases)await fs.copyFile(`${build}/${name}`,`${input}/${name}`);
 const m=structuredClone(original);await v.alter(m,input);
 const dest=`${cwd}/.local/mz/${m.buildId}`;
 if(existing){await fs.mkdir(`${dest}/data`,{recursive:true});await fs.writeFile(`${dest}/data/Map002.json`,'reviewer handdrawn sentinel\n');await fs.writeFile(`${dest}/existing-user-content.txt`,'must remain\n');}
 const before=existing?await ledger(dest):null;
 if(!v.omitManifest)await fs.writeFile(`${input}/manifest.json`,v.rawManifest??JSON.stringify(Object.hasOwn(v,'root')?v.root:m));
 const r=spawnSync('/Users/dingshinn/.nvm/versions/node/v22.21.1/bin/node',[`${implementation}/dist/scripts/prepare-mz.js`,template,input],{cwd,encoding:'utf8'});
 await fs.writeFile(`${cwd}/cli.log`,r.stdout+r.stderr);
 const present=await exists(dest),after=present?await ledger(dest):null;
 const rejected=r.status!==0;
 const preserved=existing?JSON.stringify(before)===JSON.stringify(after):!present;
 const imagesPresent=present?await Promise.all(atlases.map(name=>exists(`${dest}/img/tilesets/${name}`))):[];
 const result={label,variant:v.label,implementation:path.basename(implementation),existing,exitCode:r.status,rejected,preserved,targetExists:present,imagesPresent,stdout:r.stdout,stderrFirstLines:r.stderr.split('\n').slice(0,12).join('\n'),cwd};results.push(result);
 return result;
}
for(const v of variants){await run(v,candidate,false);await run(v,candidate,true);}
const oldVariant=variants.find(v=>v.label==='missing-entry-diagnostic_A2.png');
await run(oldVariant,old,false);
const pass=results.filter(r=>r.implementation==='candidate').every(r=>r.rejected&&r.preserved);
const oldCounterexample=results.find(r=>r.implementation==='old-301d3cd');
await fs.writeFile(`${base}/cli-probe.json`,JSON.stringify({variants:variants.length,executions:results.length,candidatePass:pass,oldCounterexampleDetected:oldCounterexample.exitCode===0&&oldCounterexample.imagesPresent.includes(false),results},null,2)+'\n');
console.log(JSON.stringify({variants:variants.length,executions:results.length,candidatePass:pass,oldCounterexample:{exitCode:oldCounterexample.exitCode,imagesPresent:oldCounterexample.imagesPresent},failures:results.filter(r=>r.implementation==='candidate'&&(!r.rejected||!r.preserved))},null,2));
process.exitCode=pass&&oldCounterexample.exitCode===0&&oldCounterexample.imagesPresent.includes(false)?0:1;
