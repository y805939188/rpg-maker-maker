import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describe,it,expect } from 'vitest';
import { compileFixedPrototype } from '../src/compiler.js';
import { blank,copyRect,decodePng,encodePng,scaleNearest,validatePixels } from '../src/pixels.js';
import { PROFILE,sourceFrameAtUpdate } from '../src/profile.js';
import { sha256,readJson } from '../scripts/io.js';

async function fixture(name:string) { return decodePng(await readFile(`tests/fixtures/${name}.png`)); }
describe('RGBA8 integer pixel contract',()=>{
  it('preserves colored, translucent and canonical transparent pixels byte-for-byte through PNG',async()=>{
    const p={width:3,height:1,data:new Uint8Array([1,2,3,255,99,127,255,128,0,0,0,0])};
    const bytes=await encodePng(p);
    expect(await decodePng(bytes)).toEqual(p);
    expect(await encodePng(p)).toEqual(bytes);
  });
  it('rejects hidden RGB, invalid buffer, dimensions, huge images and fractional crops',()=>{
    expect(()=>validatePixels({width:1,height:1,data:new Uint8Array([1,0,0,0])})).toThrow(/zero RGB/);
    expect(()=>blank(1.1,2)).toThrow();
    expect(()=>blank(0,2)).toThrow();
    expect(()=>blank(769,576)).toThrow(/limit/);
    expect(()=>validatePixels({width:1,height:1,data:new Uint8Array(3)})).toThrow(/buffer/);
    const s=blank(2,2),t=blank(3,3);
    expect(()=>copyRect(s,t,0.5,0,1,1,0,0)).toThrow(/integers/);
    expect(()=>copyRect(s,t,-1,0,1,1,0,0)).toThrow(/integers/);
    expect(()=>copyRect(s,t,1,1,2,1,0,0)).toThrow(/bounds/);
    expect(()=>copyRect(s,t,0,0,2,2,2,2)).toThrow(/bounds/);
  });
  it('copies exact half-open rectangles and handles overlapping storage',()=>{
    const p={width:3,height:1,data:new Uint8Array([1,1,1,255,2,2,2,255,3,3,3,255])};
    copyRect(p,p,0,0,2,1,1,0);
    expect([...p.data]).toEqual([1,1,1,255,1,1,1,255,2,2,2,255]);
  });
  it('uses exact nearest neighbour integer enlargement without new palette values',()=>{
    const p={width:2,height:1,data:new Uint8Array([1,2,3,255,7,8,9,128])};
    const enlarged=scaleNearest(p,2);
    expect(enlarged.width).toBe(4);expect(enlarged.height).toBe(2);
    expect([...enlarged.data]).toEqual([1,2,3,255,1,2,3,255,7,8,9,128,7,8,9,128,
      1,2,3,255,1,2,3,255,7,8,9,128,7,8,9,128]);
    expect(()=>scaleNearest(p,1.5)).toThrow();
  });
  it('rejects RGB, grayscale, ICC, other formats, 16-bit, and corrupt sources without implicit repair',async()=>{
    const rgb=await sharp({create:{width:2,height:2,channels:3,background:'#123456'}}).png().toBuffer();
    await expect(decodePng(rgb)).rejects.toThrow(/RGBA8/);
    const gray=await sharp(rgb).toColourspace('b-w').png().toBuffer();
    await expect(decodePng(gray)).rejects.toThrow(/RGBA8/);
    const icc=await sharp(rgb).ensureAlpha().withIccProfile('srgb').png().toBuffer();
    await expect(decodePng(icc)).rejects.toThrow(/without ICC/);
    const sixteen=await sharp(rgb).ensureAlpha().toColourspace('rgb16').png().toBuffer();
    await expect(decodePng(sixteen)).rejects.toThrow(/RGBA8/);
    await expect(decodePng(await sharp(rgb).jpeg().toBuffer())).rejects.toThrow(/RGBA8/);
    await expect(decodePng(new Uint8Array([1,2,3]))).rejects.toThrow();
  });
});

describe('Fixed prototype (spec §3, §8, step 01)',()=>{
  it('places exact unchanged source pixels in every declared slot, leaves all other pixels canonical empty',async()=>{
    const ground=await fixture('diagnostic-ground');
    const water=await Promise.all([0,1,2].map(f=>fixture(`diagnostic-water-${f}`)));
    const originals=[ground,...water].map(s=>sha256(s.data));
    const {a1,a2}=compileFixedPrototype(ground,water);
    for (const [atlas,slots] of [[a1,PROFILE.waterSlots],[a2,PROFILE.groundSlots]] as const) {
      expect([atlas.width,atlas.height]).toEqual([768,576]);
      for (let y=0;y<576;y++) for (let x=0;x<768;x++) {
        const slot=slots.find(s=>x>=s.x&&x<s.x+(atlas===a1?288:96)&&y>=s.y&&y<s.y+144);
        const offset=(y*768+x)*4;
        if (!slot) {
          if (atlas.data.subarray(offset,offset+4).some(v=>v!==0)) throw new Error(`Unexpected occupied ${x},${y}`);
        } else {
          const localX=x-slot.x, localY=y-slot.y;
          const source=atlas===a1?water[Math.floor(localX/96)]!:ground;
          const expected=(localY*96+localX%96)*4;
          // Buffer comparison per scan pixel exercises borders and frame seams as well as centres.
          if (!Buffer.from(atlas.data.subarray(offset,offset+4)).equals(Buffer.from(source.data.subarray(expected,expected+4)))) {
            throw new Error(`Pixel mismatch ${x},${y}`);
          }
        }
      }
    }
    expect([ground,...water].map(s=>sha256(s.data))).toEqual(originals);
  });
  it('rejects unsupported frame counts, wrong dimensions and translucent baked patterns',async()=>{
    const g=await fixture('art-ground'),w=await fixture('art-water-0');
    for (const count of [0,1,2,4,5]) expect(()=>compileFixedPrototype(g,Array(count).fill(w))).toThrow(/3 source/);
    expect(()=>compileFixedPrototype(blank(48,48),[w,w,w])).toThrow(/96×144/);
    expect(()=>compileFixedPrototype(blank(96,144),[w,w,w])).toThrow(/opaque/);
    const translucent={...w,data:w.data.slice()};translucent.data[3]=128;
    expect(()=>compileFixedPrototype(g,[w,translucent,w])).toThrow(/opaque/);
  });
  it('keeps every baked bank pixel identical across frames while water interior actually changes',async()=>{
    const frames=await Promise.all([0,1,2].map(f=>fixture(`art-water-${f}`)));
    const mask=await fixture('art-static-bank-mask');
    let staticPixels=0,changedPixels=0;
    for (let i=0;i<mask.data.length;i+=4) {
      if (mask.data[i]===255) {
        expect(frames[1]!.data.subarray(i,i+4)).toEqual(frames[0]!.data.subarray(i,i+4));
        expect(frames[2]!.data.subarray(i,i+4)).toEqual(frames[0]!.data.subarray(i,i+4));
        staticPixels++;
      } else if (frames[0]!.data[i]!==frames[1]!.data[i]) changedPixels++;
    }
    expect(staticPixels).toBeGreaterThan(1000);
    expect(changedPixels).toBeGreaterThan(1000);
  });
  it('matches provenance hashes without regenerating expected fixtures during tests',async()=>{
    const p=await readJson<{files:Record<string,string>}>('tests/fixtures/provenance.json');
    for (const [file,hash] of Object.entries(p.files)) expect(sha256(await readFile(`tests/fixtures/${file}`))).toBe(hash);
  });
});

describe('MZ update timing',()=>{
  it('has exact 30-update boundaries and ping-pong order over many cycles',()=>{
    expect([0,29,30,59,60,89,90,119,120].map(sourceFrameAtUpdate)).toEqual([0,0,1,1,2,2,1,1,0]);
    for (let i=0;i<1000;i++) expect(sourceFrameAtUpdate(i)).toBe([0,1,2,1][Math.floor(i/30)%4]);
    for (const bad of [-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) expect(()=>sourceFrameAtUpdate(bad)).toThrow();
  });
});
