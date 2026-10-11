import {readFile,writeFile} from 'node:fs/promises';
import {decodePng} from '../../dist/src/pixels.js';
import sharp from 'sharp';
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(name,data){const t=Buffer.from(name),l=Buffer.alloc(4),s=Buffer.alloc(4);l.writeUInt32BE(data.length);s.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([l,t,data,s]);}
const simple=await readFile('.local/reviewer/simple.png');
const hdrCicp=Buffer.concat([simple.subarray(0,33),chunk('cICP',Buffer.from([9,16,0,1])),simple.subarray(33)]);
await writeFile('.local/reviewer/hdr-cicp.png',hdrCicp);
try{const p=await decodePng(hdrCicp);console.log(JSON.stringify({result:'ACCEPTED',metadata:await sharp(hdrCicp).metadata(),pixels:[...p.data]},null,2));}catch(e){console.log(JSON.stringify({result:'REJECTED',error:e.message}));}
