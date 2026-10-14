import ts from 'typescript';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const p='apps/api/tests/studio/integration.test.ts';
function scan(s){const ast=ts.createSourceFile(p,s,ts.ScriptTarget.Latest,true);let c;function find(n){if(ts.isCallExpression(n)&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])&&n.arguments[0].text.startsWith('R4 real COMMIT'))c=n;ts.forEachChild(n,find);}find(ast);const a=[];function walk(n){if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&/^to[A-Z]/.test(n.expression.name.text)){const t=n.getText(ast).replace(/\s+/g,' ').trim();if(/^(expect|browserExpect)\s*[(.]/.test(t))a.push({line:ast.getLineAndCharacterOfPosition(n.getStart()).line+1,text:t});}ts.forEachChild(n,walk);}walk(c);return a;}
const old=scan(execFileSync('git',['show','87e13a8a99db3058dce8680d3ae985969b8a9bac:'+p],{encoding:'utf8'})),current=scan(await readFile(p,'utf8'));
const result={old,current,unchanged:old.filter(a=>current.some(b=>a.text===b.text)),removed:old.filter(a=>!current.some(b=>a.text===b.text)),added:current.filter(a=>!old.some(b=>a.text===b.text))};
await writeFile('.local/step07-review/evidence/expect-assertion-site-map.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({old:old.length,current:current.length,identical:result.unchanged.length,removed:result.removed.length,added:result.added.length}));
