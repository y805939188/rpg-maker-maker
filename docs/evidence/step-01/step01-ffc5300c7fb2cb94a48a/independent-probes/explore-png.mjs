import sharp from 'sharp';
import { decodePng } from '../../dist/src/pixels.js';
import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
function crc(bytes) { let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0; }
function chunk(name,data){const type=Buffer.from(name);const size=Buffer.alloc(4);size.writeUInt32BE(data.length);const checksum=Buffer.alloc(4);checksum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([size,type,data,checksum]);}
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1,0);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6;
const simple=Buffer.concat([signature,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(Buffer.from([0,1,2,3,255]))),chunk('IEND',Buffer.alloc(0))]);
const actl=Buffer.alloc(8);actl.writeUInt32BE(2);actl.writeUInt32BE(0,4);
function frameControl(sequence){const d=Buffer.alloc(26);d.writeUInt32BE(sequence,0);d.writeUInt32BE(1,4);d.writeUInt32BE(1,8);d.writeUInt16BE(1,20);d.writeUInt16BE(2,22);return d;}
const fdata=Buffer.concat([Buffer.from([0,0,0,2]),deflateSync(Buffer.from([0,7,8,9,255]))]);
const animated=Buffer.concat([signature,chunk('IHDR',ihdr),chunk('acTL',actl),chunk('fcTL',frameControl(0)),chunk('IDAT',deflateSync(Buffer.from([0,1,2,3,255]))),chunk('fcTL',frameControl(1)),chunk('fdAT',fdata),chunk('IEND',Buffer.alloc(0))]);
const gamma=Buffer.alloc(4);gamma.writeUInt32BE(100000);
const gammaConflict=Buffer.concat([signature,chunk('IHDR',ihdr),chunk('gAMA',gamma),chunk('IDAT',deflateSync(Buffer.from([0,1,2,3,255]))),chunk('IEND',Buffer.alloc(0))]);
const palette=await sharp(Buffer.from([1,2,3,255,4,5,6,128]),{raw:{width:2,height:1,channels:4}}).png({palette:true}).toBuffer();
const results={};
for(const[name,bytes]of Object.entries({simple,palette,animated,gammaConflict})){
 await writeFile(`.local/reviewer/${name}.png`,bytes);
 const metadata=await sharp(bytes).metadata();
 try{const p=await decodePng(bytes);results[name]={result:'ACCEPTED',metadata,decoded:[...p.data]};}catch(e){results[name]={result:'REJECTED',metadata,error:e.message};}
}
await writeFile('.local/reviewer/png-results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
