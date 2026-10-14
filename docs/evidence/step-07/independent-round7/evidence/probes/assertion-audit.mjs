import ts from 'typescript';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const path='apps/api/tests/studio/integration.test.ts';
const old=execFileSync('git',['show','87e13a8a99db3058dce8680d3ae985969b8a9bac:'+path],{encoding:'utf8'});
const current=await readFile(path,'utf8');
function inspect(source){
 const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);
 let candidate;
 function find(n){if(ts.isCallExpression(n)&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])&&n.arguments[0].text.startsWith('R4 real COMMIT'))candidate=n; ts.forEachChild(n,find);}
 find(ast);assert.ok(candidate);
 const assertions=[];
 function visit(n){if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&/^to[A-Z]/.test(n.expression.name.text))assertions.push({line:ast.getLineAndCharacterOfPosition(n.getStart()).line+1,text:n.getText(ast).replace(/\s+/g,' ')});ts.forEachChild(n,visit);}
 visit(candidate);return {assertions,source: candidate.getText(ast),ast};
}
const a=inspect(old),b=inspect(current);
const oldAssertions=a.assertions.filter(x=>!b.assertions.some(y=>x.text===y.text));
const newAssertions=b.assertions.filter(x=>!a.assertions.some(y=>x.text===y.text));
const result={oldCount:a.assertions.length,newCount:b.assertions.length,unchangedCount:a.assertions.length-oldAssertions.length,oldChanged:oldAssertions,newChanged:newAssertions,testCaseCounts:{old:(old.match(/^it\(/gm)||[]).length,new:(current.match(/^it\(/gm)||[]).length},sameStep07ConfigSHA256:createHash('sha256').update(await readFile('vitest.step07.config.ts')).digest('hex')};
await writeFile('.local/step07-review/evidence/assertion-ast-map.json',JSON.stringify(result,null,2)+'\n');
const helper=b.ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='r4DownloadedFiles');
const crc=b.ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='crc');
assert.ok(helper&&crc);
const text=helper.getText(b.ast)+'\n'+crc.getText(b.ast);
const compiled=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const expect=(v)=>({toBe:x=>assert.strictEqual(v,x),toEqual:x=>assert.deepStrictEqual(v,x),toBeUndefined:()=>assert.strictEqual(v,undefined)});
const parse=Function('expect','Buffer',compiled+'\nreturn r4DownloadedFiles;')(expect,Buffer);
const oldZip='/Users/dingshinn/Desktop/rpg-maker-maker/docs/evidence/step-07/independent-round6/evidence/download/production-first.zip';
const zip=await readFile(oldZip);parse(zip);
const folder='.local/step07-review/private/zip-negative';await mkdir(folder,{recursive:true});
const local={};let cursor=0;
while(zip.readUInt32LE(cursor)===0x04034b50){const len=zip.readUInt32LE(cursor+18),n=zip.readUInt16LE(cursor+26),e=zip.readUInt16LE(cursor+28);local[zip.subarray(cursor+30,cursor+30+n).toString()]=cursor;cursor+=30+n+e+len;}
const controls=[];
function check(name,mutate){const copy=Buffer.from(zip);mutate(copy);let accepted=true,error;
 try{parse(copy);}catch(e){accepted=false;error=e.message;}
 controls.push({name,acceptedByExactCandidateHelper:accepted,error:error?.slice(0,500),sha256:createHash('sha256').update(copy).digest('hex'),bytes:copy.length});return writeFile(folder+'/'+name+'.zip',copy);}
await check('normal',()=>{});
await check('local-crc',z=>z.writeUInt32LE((z.readUInt32LE(local['A1.png']+14)^1)>>>0,local['A1.png']+14));
await check('central-crc',z=>z.writeUInt32LE((z.readUInt32LE(cursor+16)^1)>>>0,cursor+16));
await check('central-unsafe-member',z=>Buffer.from('../bad').copy(z,cursor+46));
await check('central-extra-count',z=>{z.writeUInt16LE(9,z.length-14);z.writeUInt16LE(9,z.length-12);});
await check('local-file-pixel',z=>{const at=local['A1.png'];z[at+30+z.readUInt16LE(at+26)+100]^=1;});
await writeFile('.local/step07-review/evidence/zip-negative-controls.json',JSON.stringify({source:'f5740c1fd0e9e22a4f4676de51b7fd2555bc05a5',helperSHA256:createHash('sha256').update(text).digest('hex'),normalActualR6Download:oldZip,normalSHA256:createHash('sha256').update(zip).digest('hex'),substitution:'Only Vitest expect comparison methods replaced with equivalent node:assert operations; helper/CRC source unchanged',centralOffset:cursor,controls},null,2)+'\n');
console.log(JSON.stringify({assertions:result,zipControls:controls},null,2));
