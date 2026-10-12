import { readFile } from 'node:fs/promises';
import { RawSource, RgbaImage, buildProcessedAsset, hashBytes, styleProfile } from '@tileset/asset-core';
import type { AnimationClip, Geometry, SourceRole, ValidatedSource } from '@tileset/asset-core';
import { decodeSource, encodePng } from '@tileset/image-adapter';
import { processShoreline, shorelineParameters, shorelineRecipe } from '@tileset/material-processing';

// Independent source annotation. No import from the compiler's mapping/shape implementation.
const rows = [
  ['representative-nw','representative-ne','inner-nw','inner-ne'],
  ['representative-sw','representative-se','inner-sw','inner-se'],
  ['outer-nw','north-e','north-w','outer-ne'],
  ['west-s','center-se','center-sw','east-s'],
  ['west-n','center-ne','center-nw','east-n'],
  ['outer-sw','south-e','south-w','outer-se'],
];
export function sourceGeometry(permuted = false): Geometry {
  return {width:96,height:144,tileWidth:48,tileHeight:48,regions:rows.flatMap((row,y) => row.map((name,x) => {
    const slot = permuted ? (y*4+x+9)%24 : y*4+x;
    return { name,role:name.startsWith('inner') ? 'inner-corner' as const : name.startsWith('outer') ? 'outer-corner' as const : /^(center|representative)/.test(name) ? 'center' as const : 'edge' as const,
      rect:{x:slot%4*24,y:Math.floor(slot/4)*24,width:24,height:24}};
  }))};
}
function rearrange(image: RgbaImage, permuted: boolean): RgbaImage {
  if (!permuted) return image;
  const source=image.bytes(), data=new Uint8Array(source.length);
  for(let q=0;q<24;q++) for(let y=0;y<24;y++) {
    const target=(q+9)%24, start=((Math.floor(q/4)*24+y)*96+q%4*24)*4;
    data.set(source.subarray(start,start+96),((Math.floor(target/4)*24+y)*96+target%4*24)*4);
  }
  return new RgbaImage({width:96,height:144,data});
}
export async function makeCompilerFixture(family: 'art' | 'diagnostic', permuted=false) {
  const files:Record<string,Uint8Array>={}, originalHashes:Record<string,string>={};
  const load = async(name:string, role:SourceRole,density:number) => {
    const bytes=await readFile(`tests/fixtures/${name}`); originalHashes[name]=hashBytes(bytes);
    const result=await decodeSource(new RawSource({id:'original-'+name.replace('.png',''),revision:1,role,density,encoding:'png',bytes,
      provenance:{origin:'manual',author:'Original step01 authored fixture',license:'CC0-1.0',toolVersion:'original-fixtures-v1.1',parents:[]}}));
    if(result.status!=='validated') throw Error(result.diagnostic.code);
    return result.source;
  };
  const density=family==='art'?2:1;
  const originalGround=await load(`${family}-ground.png`,'grass',density);
  const originalWater=[];
  for(let i=0;i<3;i++) originalWater.push(await load(`${family}-water-${i}.png`,'water',density));
  const originalMask=await load('art-static-bank-mask.png','static-mask',2);
  const mask=originalMask.image.bytes(), overlay=new Uint8Array(mask.length), originalBank=originalWater[0]!.image.bytes();
  const water=originalWater.map(s=>s.image.bytes());
  // Explicit source decomposition preserves the independently authored art master.
  // Diagnostic bank is owned by the ground; new diagnostic water differs in mask-white pixels.
  for(let i=0;i<mask.length;i+=4) if(mask[i]===255) {
    if(family==='art') overlay.set(originalBank.subarray(i,i+4),i);
    for(const frame of water) frame.set([42,111,145,255],i);
  }
  const planes=[originalGround.image,...water.map(data=>new RgbaImage({width:96,height:144,data})),originalMask.image,new RgbaImage({width:96,height:144,data:overlay})];
  const palette = new Map<string,[number,number,number]>();
  for(const plane of planes) { const b=plane.bytes();for(let i=0;i<b.length;i+=4) if(b[i+3])palette.set(`${b[i]},${b[i+1]},${b[i+2]}`,[b[i]!,b[i+1]!,b[i+2]!]); }
  // Binary mask colors are not visual palette entries.
  palette.delete('0,0,0');palette.delete('255,255,255');
  // White labels are visible in the diagnostic source.
  if(family==='diagnostic')palette.set('255,255,255',[255,255,255]);
  const sources:ValidatedSource[]=[];
  const ids=['grass','water-0','water-1','water-2','mask','bank-overlay'];
  const roles:SourceRole[]=['grass','water','water','water','static-mask','bank-overlay'];
  const parents=[originalGround.ref,...originalWater.map(s=>s.ref),originalMask.ref];
  for(let i=0;i<planes.length;i++) {
    const bytes=await encodePng(rearrange(planes[i]!,permuted)); files[`sources/${ids[i]}.png`]=bytes;
    const result=await decodeSource(new RawSource({id:`${family}-${ids[i]}`,revision:1,role:roles[i]!,density,encoding:'png',bytes,
      provenance:{origin:'deterministic',author:'AI Tileset Studio / step04 source decomposition',license:'CC0-1.0',toolVersion:'step04-fixture-v1',parents}}));
    if(result.status!=='validated')throw Error(result.diagnostic.code);
    sources.push(result.source);
  }
  const style=styleProfile(`${family}-style`,1,{logicalPixelScale:density,palette:[...palette.values()],lighting:'flat',outline:'dark'});
  const animation:AnimationClip={frameCount:3,sequence:[0,1,2,1],durations:[30,30,30,30],timebase:'updates',loop:true};
  const parameters=shorelineParameters(`${family}-parameters`,2,{geometry:sourceGeometry(permuted),animation,composition:'linear-srgb-source-over',mask:'white-static-bank'});
  const recipe=shorelineRecipe(`${family}-recipe`,2,{version:'fixed-shoreline-v1',grass:sources[0]!.ref,water:sources.slice(1,4).map(s=>s.ref),staticMask:sources[4]!.ref,bankOverlay:sources[5]!.ref,style:style.ref,parameters:parameters.ref});
  const built=buildProcessedAsset(processShoreline({sources,style,parameters,recipe}),`${family}-processed`);
  return {built,files,originalHashes,originalGround,originalWater,originalMask,sources,style,parameters,recipe};
}
