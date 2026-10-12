import { strict as assert } from 'node:assert';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderShape, sourceFrameAtUpdate } from '@tileset/mz-compiler';
import { loadNativeOracle, nativeRects, nativeUpdates } from './mz-oracle.js';
import { preflightStep04 } from './step04-input.js';
import { makeCompilerFixture } from './step04-fixture.js';
import { PROFILE } from '../src/profile.js';
import { compileFixedPrototype } from '../src/compiler.js';
import { encodePng } from '@tileset/image-adapter';
import { RgbaImage } from '@tileset/asset-core';

const [corePath,buildPath]=process.argv.slice(2);
if(!corePath||!buildPath)throw Error('Usage: pnpm verify:step04 <licensed rmmz_core.js> <immutable step04 sample>');
const native=await loadNativeOracle(corePath),input=await preflightStep04(buildPath);
let tilesChecked=0,pixelsChecked=0;
for(const f of input.replays)for(const slot of [...PROFILE.groundSlots,...PROFILE.waterSlots]){
  const water=slot.kind<16,atlas=(water?f.a1:f.a2).pixels();
  for(let state=0;state<(water?4:1);state++)for(let shape=0;shape<48;shape++){
    const output=renderShape(water?f.water:f.ground,shape,state*30).bytes();
    const rects=nativeRects(native,slot.kind,shape,state);assert.equal(rects.length,4);
    for(const r of rects){assert.equal(r.set,water?0:1);assert.equal(r.w,24);assert.equal(r.h,24);
      for(let y=0;y<24;y++)for(let x=0;x<24;x++){
        const actual=((r.sy+y)*768+r.sx+x)*4,expected=((r.dy+y)*48+r.dx+x)*4;
        assert.deepEqual(atlas.data.subarray(actual,actual+4),output.subarray(expected,expected+4));pixelsChecked++;
      }
    }tilesChecked++;
  }
}
const updates=nativeUpdates(native,600);
for(const s of updates){const rect=nativeRects(native,4,0,s.animationFrame)[0]!;assert.equal(s.animationFrame,Math.floor(s.animationCount/30));assert.equal(Math.floor((rect.sx-384)/96),sourceFrameAtUpdate(s.animationCount));}
// Independently authored preexisting art expected; old prototype compared only for regression.
const art=await makeCompilerFixture('art');
const old=compileFixedPrototype(art.originalGround.image.pixels(),art.originalWater.map(s=>s.image.pixels()));
for(const [name,image]of [['A1',old.a1],['A2',old.a2]] as const)assert.deepEqual(await encodePng(new RgbaImage(image)),input.files[`art/${name}.png`]);
const report={buildId:input.manifest.buildId,commit:input.manifest.identity.commit,manifestSha256:input.manifestSha256,coreSha256:PROFILE.coreSha256,result:'PASS',
  scope:'Pinned unmodified native Tilemap in Node VM with PIXI/layer stub reading actual new Compiler atlases; CPU rectangle/pixel validation, not GUI/GPU/game/independent Review',
  connectedShapes:47,representativeIndices:[47],sourceWaterFrames:3,playbackStates:4,families:2,diagnosticSlots:{ground:2,water:2},tilesChecked,pixelsChecked,updatesChecked:updates.length,
  sampleUpdates:[0,29,30,59,60,89,90,119,120,240,600].map(n=>({update:n,sourceFrame:sourceFrameAtUpdate(n)})),
  artPrototypeByteRegression:'PASS_BOTH_PNG',diagnosticChange:'Mask-white pixels now retain diagnostic ground across frames; expected new step03 bake',
  independentReview:'NOT_EXECUTED_BY_DESIGN',editorDrawing:'NOT_EXECUTED',gameRuntime:'NOT_EXECUTED',nativeOriginalHost:'NOT_EXECUTED'};
await mkdir('.local/evidence',{recursive:true});await writeFile(resolve('.local/evidence',`${input.manifest.buildId}-native-oracle.json`),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report,null,2));

