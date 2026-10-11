import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const base=path.dirname(new URL(import.meta.url).pathname);
const target=path.resolve(process.argv[2]||`${base}/candidate`);
const {copyRect}=await import(pathToFileURL(`${target}/dist/src/pixels.js`));
let cases=0;const failures=[];const categories={};
function check(label,sw,sh,tw,th,so,to,sourceType,targetType,sx,sy,w,h,dx,dy){
 const count=Math.max(so+sw*sh*4,to+tw*th*4)+17;
 const backing=Buffer.alloc(count);for(let i=0;i<count;i++)backing[i]=1+(i*31+i%7)%254;
 const original=Uint8Array.from(backing),expected=Uint8Array.from(backing);
 // Oracle snapshots the entire independent backing store; per-pixel addressing uses both strides.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<4;c++)
  expected[to+((dy+y)*tw+dx+x)*4+c]=original[so+((sy+y)*sw+sx+x)*4+c];
 const view=(t,o,l)=>t==='Buffer'?Buffer.from(backing.buffer,backing.byteOffset+o,l):new Uint8Array(backing.buffer,backing.byteOffset+o,l);
 copyRect({width:sw,height:sh,data:view(sourceType,so,sw*sh*4)},{width:tw,height:th,data:view(targetType,to,tw*th*4)},sx,sy,w,h,dx,dy);
 cases++;categories[label]=(categories[label]||0)+1;
 if(!backing.every((value,index)=>value===expected[index]))failures.push({label,sw,sh,tw,th,so,to,sourceType,targetType,sx,sy,w,h,dx,dy,actual:[...backing],expected:[...expected]});
}
for(const [label,sw,sh,tw,th,so,to] of [
 ['same-storage-four-directions',4,4,4,4,8,8],['shifted-shared-views',3,4,4,3,8,16],['reverse-shared-views',4,3,3,4,16,8],['nonpixel-byteoffset-views',3,3,3,3,5,9],['nonoverlap',3,3,4,3,8,80]])
 for(const st of ['Buffer','Uint8Array'])for(const tt of ['Buffer','Uint8Array'])
  for(let w=1;w<=Math.min(sw,tw);w++)for(let h=1;h<=Math.min(sh,th);h++)
   for(let sy=0;sy+h<=sh;sy++)for(let sx=0;sx+w<=sw;sx++)
    for(let dy=0;dy+h<=th;dy++)for(let dx=0;dx+w<=tw;dx++)check(label,sw,sh,tw,th,so,to,st,tt,sx,sy,w,h,dx,dy);
const result={implementation:target,cases,categories,failures:failures.length,pass:failures.length===0,firstFailures:failures.slice(0,5)};
const name=path.basename(target);fs.writeFileSync(`${base}/overlap-${name}.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,firstFailures:result.firstFailures.map(({actual,expected,...rest})=>rest)},null,2));
process.exitCode=result.pass?0:1;
