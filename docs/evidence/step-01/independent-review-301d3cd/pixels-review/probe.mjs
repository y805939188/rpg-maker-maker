import { decodePng, encodePng, copyRect, scaleNearest } from '../../dist/src/pixels.js';
import { compileFixedPrototype } from '../../dist/src/compiler.js';
import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
let state=0x71be3429;
function rand(n){state=(Math.imul(state,1664525)+1013904223)>>>0;return state%n;}
const results={version:process.version,pixelRoundtrips:0,overlapCopies:0,nearestChecks:0,legalCompiles:0,png:[]};
for(let test=0;test<150;test++){
  const width=1+rand(25),height=1+rand(25),data=new Uint8Array(width*height*4);
  for(let i=0;i<data.length;i+=4){const a=rand(256);data[i]=a?rand(256):0;data[i+1]=a?rand(256):0;data[i+2]=a?rand(256):0;data[i+3]=a;}
  const source={width,height,data};
  assert.deepEqual(await decodePng(await encodePng(source)),source);results.pixelRoundtrips++;
  const factor=1+rand(4),scaled=scaleNearest(source,factor);
  for(let y=0;y<scaled.height;y++)for(let x=0;x<scaled.width;x++){
    const i=(y*scaled.width+x)*4,j=(Math.floor(y/factor)*width+Math.floor(x/factor))*4;
    assert.deepEqual(scaled.data.slice(i,i+4),data.slice(j,j+4));
  }results.nearestChecks++;
}
for(let test=0;test<500;test++){
  const width=1+rand(25),height=1+rand(25),data=new Uint8Array(width*height*4);
  for(let i=0;i<data.length;i+=4){data[i]=rand(256);data[i+1]=rand(256);data[i+2]=rand(256);data[i+3]=255;}
  const p={width,height,data},w=1+rand(width),h=1+rand(height),sx=rand(width-w+1),sy=rand(height-h+1),dx=rand(width-w+1),dy=rand(height-h+1);
  const before=data.slice(),expected=data.slice();
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let channel=0;channel<4;channel++)expected[((dy+y)*width+dx+x)*4+channel]=before[((sy+y)*width+sx+x)*4+channel];
  copyRect(p,p,sx,sy,w,h,dx,dy);assert.deepEqual(data,expected);results.overlapCopies++;
}
for(let test=0;test<5;test++){
  const inputs=Array.from({length:4},()=>{const data=new Uint8Array(96*144*4);for(let i=0;i<data.length;i+=4){data[i]=rand(256);data[i+1]=rand(256);data[i+2]=rand(256);data[i+3]=255;}return {width:96,height:144,data};});
  const snapshots=inputs.map(p=>p.data.slice()),{a1,a2}=compileFixedPrototype(inputs[0],inputs.slice(1));
  for(const [atlas,ys,frames]of [[a1,[0,144],inputs.slice(1)],[a2,[0],[]]]){
    for(let y=0;y<576;y++)for(let x=0;x<768;x++){
      const i=(y*768+x)*4;
      let expected=Uint8Array.from([0,0,0,0]);
      if(atlas===a1&&x>=384&&x<672&&ys.some(v=>y>=v&&y<v+144)){const source=frames[Math.floor((x-384)/96)];const localY=y%144,j=(localY*96+(x-384)%96)*4;expected=source.data.slice(j,j+4);}
      if(atlas===a2&&x<192&&y<144){const j=(y*96+x%96)*4;expected=inputs[0].data.slice(j,j+4);}
      assert.deepEqual(atlas.data.slice(i,i+4),expected);
    }
  }
  inputs.forEach((p,i)=>assert.deepEqual(p.data,snapshots[i]));results.legalCompiles++;
}
function crc32(b){let v=0xffffffff;for(const octet of b){v^=octet;for(let i=0;i<8;i++)v=(v>>>1)^((v&1)?0xedb88320:0);}return (v^0xffffffff)>>>0;}
function chunk(type,data=Buffer.alloc(0)){const prefix=Buffer.alloc(8);prefix.writeUInt32BE(data.length);prefix.write(type,4,4,'ascii');const suffix=Buffer.alloc(4);suffix.writeUInt32BE(crc32(Buffer.concat([prefix.subarray(4),data])));return Buffer.concat([prefix,data,suffix]);}
const signature=Buffer.from([137,80,78,71,13,10,26,10]),header=Buffer.alloc(13);header.writeUInt32BE(1);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
const ihdr=chunk('IHDR',header),compressed=deflateSync(Buffer.from([0,1,2,3,255])),idat=chunk('IDAT',compressed),iend=chunk('IEND'),srgb=chunk('sRGB',Buffer.from([0]));
const cases={
  valid: [ihdr,idat,iend],
  unknownCritical:[ihdr,chunk('ABCD'),idat,iend],
  invalidChunkName:[ihdr,chunk('a!Cd'),idat,iend],
  reservedBit:[ihdr,chunk('abcd'),idat,iend],
  srgbAfterIDAT:[ihdr,idat,srgb,iend],
  duplicateSRGB:[ihdr,srgb,srgb,idat,iend],
  srgbDifferentIntents:[ihdr,srgb,chunk('sRGB',Buffer.from([1])),idat,iend],
  nonconsecutiveIDAT:[ihdr,chunk('IDAT',compressed.subarray(0,4)),chunk('tEXt',Buffer.from('a\0b')),chunk('IDAT',compressed.subarray(4)),iend],
  noIDAT:[ihdr,iend],
  idatExtraDeflate:[ihdr,chunk('IDAT',Buffer.concat([compressed,deflateSync(Buffer.from([0,7,8,9,255]))])),iend],
  tooLongScanline:[ihdr,chunk('IDAT',deflateSync(Buffer.from([0,1,2,3,255,99]))),iend],
  sBIT4:[ihdr,chunk('sBIT',Buffer.from([4,4,4,4])),idat,iend],
  transparencyNotPermitted:[ihdr,chunk('tRNS',Buffer.from([0,1,0,2,0,3])),idat,iend]
};
for(const [name,chunks]of Object.entries(cases)){
 const bytes=Buffer.concat([signature,...chunks]);await writeFile(`.local/pixels-review/${name}.png`,bytes);
 try {const p=await decodePng(bytes);results.png.push({name,accepted:true,data:[...p.data]});}catch(e){results.png.push({name,accepted:false,error:e.message});}
}
await writeFile('.local/pixels-review/results.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
