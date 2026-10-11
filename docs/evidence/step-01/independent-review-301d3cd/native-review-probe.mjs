import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import {compileFixedPrototype} from '../dist/src/compiler.js';
import {decodePng,encodePng} from '../dist/src/pixels.js';
const corePath='/Users/dingshinn/Library/Application Support/Steam/steamapps/common/RPG Maker MZ/RPGMZ.app/Contents/Resources/newdata/js/rmmz_core.js';
const core=await readFile(corePath);
assert.equal(createHash('sha256').update(core).digest('hex'),'4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f');
const text=core.toString('utf8'),start=text.indexOf('function Tilemap()'),end=text.indexOf('// Internal classes',start);
const T=runInNewContext(text.slice(start,end)+'\nTilemap;',{PIXI:{Container:function(){}}});
// Neighbour-derived quarter semantics are written independently of FLOOR_AUTOTILE_TABLE.
// Each quadrant uses its two incident cardinal neighbours; a missing diagonal only
// creates an inner corner when both incident cardinal neighbours exist.
function quarters(m) {
 const [n,e,s,w,nw,ne,se,sw]=Array.from({length:8},(_,i)=>!!(m&(1<<i)));
 return [
  n&&w?(nw?[2,4]:[2,0]):n?[0,4]:w?[2,2]:[0,2],
  n&&e?(ne?[1,4]:[3,0]):n?[3,4]:e?[1,2]:[3,2],
  s&&w?(sw?[2,3]:[2,1]):s?[0,3]:w?[2,5]:[0,5],
  s&&e?(se?[1,3]:[3,1]):s?[3,3]:e?[1,5]:[3,5],
 ];
}
const shapeMasks=new Map();
for(let m=0;m<256;m++) {
 const expected=JSON.stringify(quarters(m));
 const shape=T.FLOOR_AUTOTILE_TABLE.findIndex(q=>JSON.stringify(q)===expected);
 assert.ok(shape>=0&&shape<47,`Neighbour mask ${m} not covered`);
 shapeMasks.set(shape,[...(shapeMasks.get(shape)||[]),m]);
}
assert.equal(shapeMasks.size,47);
assert.deepEqual(JSON.parse(JSON.stringify(T.FLOOR_AUTOTILE_TABLE[47])),[[0,0],[1,0],[0,1],[1,1]]);
// Valid alternative sources: vary every coordinate and channel, never fixture content.
const sources=Array.from({length:4},(_,f)=>{
 const p={width:96,height:144,data:new Uint8Array(96*144*4)};
 for(let y=0;y<144;y++)for(let x=0;x<96;x++)p.data.set([(x*17+y*43+f*23)%256,(x*31+y*7+f*67)%256,(x*13+y*29+f*89)%256,255],(y*96+x)*4);
 return p;
});
const result=compileFixedPrototype(sources[0],sources.slice(1));
let tiles=0,pixels=0;
for(const [kind,ox,oy,set,frames] of [[16,0,0,1,1],[17,96,0,1,1],[4,384,0,0,4],[6,384,144,0,4]]) {
 for(let f=0;f<frames;f++)for(let shape=0;shape<48;shape++) {
  const rects=[];
  T.prototype._addAutotile.call({tileWidth:48,tileHeight:48,animationFrame:f,_isTableTile:()=>false},{addRect(...r){rects.push(r);}},2048+kind*48+shape,0,0);
  assert.equal(rects.length,4);
  const sf=set===1?0:1+[0,1,2,1][f],atlas=set===1?result.a2:result.a1;
  for(let i=0;i<4;i++) {
   const [rset,sx,sy,dx,dy,w,h]=rects[i],q=T.FLOOR_AUTOTILE_TABLE[shape][i];
   assert.deepEqual([rset,sx,sy,dx,dy,w,h],[set,ox+(set===0?(sf-1)*96:0)+q[0]*24,oy+q[1]*24,(i%2)*24,Math.floor(i/2)*24,24,24]);
   for(let y=0;y<24;y++)for(let x=0;x<24;x++) {
    const a=((sy+y)*768+sx+x)*4,b=((q[1]*24+y)*96+q[0]*24+x)*4;
    assert.deepEqual(atlas.data.slice(a,a+4),sources[sf].data.slice(b,b+4));pixels++;
   }
  }
  tiles++;
 }
}
// Exact static mask is preserved after native assembling in each shape/state.
const art=await Promise.all([0,1,2].map(f=>readFile(`tests/fixtures/art-water-${f}.png`).then(decodePng)));
const mask=await decodePng(await readFile('tests/fixtures/art-static-bank-mask.png'));
let staticPixels=0,changes=0;
for(let i=0;i<mask.data.length;i+=4) {
 if(mask.data[i]===255) {for(let f=1;f<3;f++)assert.deepEqual(art[f].data.slice(i,i+4),art[0].data.slice(i,i+4));staticPixels++;}
 else if(!Buffer.from(art[0].data.slice(i,i+4)).equals(Buffer.from(art[1].data.slice(i,i+4))))changes++;
}
const report={targetCommit:'301d3cdb37743a53eff6046ccf2b23aea0ab8122',scope:'Independent neighbour-quarter combinatorics and alternative-source copy placement; not editor or GPU execution',neighbourMasks:256,normalShapes:shapeMasks.size,representativeShape:47,alternativeSourceTiles:tiles,alternativeSourcePixels:pixels,staticPixels,interiorChangedPixels:changes,normalShapeMaskCounts:Object.fromEntries([...shapeMasks].sort((a,b)=>a[0]-b[0]).map(([shape,masks])=>[shape,masks.length])),result:'PASS'};
await writeFile('.local/native-review-probe-result.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
