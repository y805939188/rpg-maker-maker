import { deflateSync } from 'node:zlib';

// Independently construct valid PNG wire encodings instead of mocking Sharp metadata.
function crc(bytes:Uint8Array):number {
  let c=0xffffffff;
  for(const b of bytes) { c^=b;for(let i=0;i<8;i++) c=(c>>>1)^((c&1)?0xedb88320:0); }
  return (c^0xffffffff)>>>0;
}
export function chunk(name:string,data:Uint8Array):Buffer {
  const type=Buffer.from(name),size=Buffer.alloc(4),checksum=Buffer.alloc(4);
  size.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([type,data])));
  return Buffer.concat([size,type,data,checksum]);
}
export function pngSample(extra:readonly Buffer[]=[],animated=false):Buffer {
  const signature=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1,0);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6;
  const idat=chunk('IDAT',deflateSync(Buffer.from([0,1,2,3,255])));
  const iend=chunk('IEND',Buffer.alloc(0));
  if(!animated) return Buffer.concat([signature,chunk('IHDR',ihdr),...extra,idat,iend]);
  const actl=Buffer.alloc(8);actl.writeUInt32BE(2);
  const control=(sequence:number)=>{
    const d=Buffer.alloc(26);d.writeUInt32BE(sequence);d.writeUInt32BE(1,4);d.writeUInt32BE(1,8);
    d.writeUInt16BE(1,20);d.writeUInt16BE(2,22);return chunk('fcTL',d);
  };
  return Buffer.concat([signature,chunk('IHDR',ihdr),chunk('acTL',actl),control(0),idat,
    control(1),chunk('fdAT',Buffer.concat([Buffer.from([0,0,0,2]),deflateSync(Buffer.from([0,7,8,9,255]))])),iend]);
}
