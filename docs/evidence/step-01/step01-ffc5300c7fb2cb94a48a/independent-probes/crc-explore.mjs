import {decodePng} from '../../dist/src/pixels.js';
import {readFile} from 'node:fs/promises';
const simple=await readFile('.local/reviewer/simple.png');
const outcomes={};
for(const[name,start]of[['IHDR',8],['IDAT',33],['IEND',simple.length-12]]){
 const modified=Buffer.from(simple);const length=modified.readUInt32BE(start);modified[start+8+length]^=1;
 try{const p=await decodePng(modified);outcomes[name]={result:'ACCEPTED',pixels:[...p.data]};}catch(e){outcomes[name]={result:'REJECTED',error:e.message};}
}
console.log(JSON.stringify(outcomes,null,2));
