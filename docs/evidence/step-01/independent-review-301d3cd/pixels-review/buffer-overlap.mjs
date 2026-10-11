import {copyRect} from '../../dist/src/pixels.js';
import {writeFile} from 'node:fs/promises';
const input=Buffer.from([1,1,1,255,2,2,2,255,3,3,3,255]);
const p={width:1,height:3,data:input};
copyRect(p,p,0,0,1,2,0,1);
const actual=[...p.data],expected=[1,1,1,255,1,1,1,255,2,2,2,255];
const result={bufferIsUint8Array:input instanceof Uint8Array,actual,expected,pass:actual.every((v,i)=>v===expected[i])};
await writeFile('.local/pixels-review/buffer-overlap.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
