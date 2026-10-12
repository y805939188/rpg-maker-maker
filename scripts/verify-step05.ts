import { strict as assert } from 'node:assert';
import { renderShape, sourceFrameAtUpdate } from '@tileset/mz-compiler';
import { loadNativeOracle, nativeRects, nativeUpdates } from './mz-oracle.js';
import { readPackExport } from './pack-export.js';
import { PROFILE } from '../src/profile.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RgbaImage, hashBytes } from '@tileset/asset-core';
import { encodePng } from '@tileset/image-adapter';

const [corePath,buildPath,galleryPath]=process.argv.slice(2);
if(!corePath||!buildPath)throw Error('Usage: pnpm verify:step05 <licensed rmmz_core.js> <formal Pack export>');
const native=await loadNativeOracle(corePath),pack=await readPackExport(buildPath);let tiles=0,pixels=0;
for(const p of pack.input.plan.placements) {
  const f=pack.fragments.find(f=>f.contentHash===p.binding.fragment.contentHash)!;
  const atlas=(p.atlas==='A1'?pack.atlases.a1:pack.atlases.a2).bytes();
  for(let state=0;state<(p.atlas==='A1'?4:1);state++)for(let shape=0;shape<48;shape++) {
    const expected=renderShape(f,shape,state*30).bytes();
    for(const r of nativeRects(native,p.kind,shape,state)) {
      assert.equal(r.set,p.atlas==='A1'?0:1);assert.equal(r.w,24);assert.equal(r.h,24);
      for(let y=0;y<24;y++)for(let x=0;x<24;x++) {
        const src=((r.sy+y)*768+r.sx+x)*4,dst=((r.dy+y)*48+r.dx+x)*4;
        assert.deepEqual(atlas.subarray(src,src+4),expected.subarray(dst,dst+4));pixels++;
      }
    } tiles++;
  }
}
const updates=nativeUpdates(native,600);
for(const state of updates)for(const p of pack.input.plan.placements.filter(p=>p.atlas==='A1')) {
  const r=nativeRects(native,p.kind,0,state.animationFrame)[0]!;
  assert.equal(Math.floor((r.sx-p.x)/96),sourceFrameAtUpdate(state.animationCount));
}
const gallery: Record<string,string> = {};
if(galleryPath) {
  await mkdir(galleryPath);
  for(let state=0;state<4;state++) {
    const data=new Uint8Array(768*576*4);
    for(const p of pack.input.plan.placements)for(let shape=0;shape<48;shape++) {
      const column=(p.atlas==='A1'?PROFILE.waterSlots:PROFILE.groundSlots).findIndex(s=>s.kind===p.kind);
      const dx=(column*8+shape%8)*48,dy=((p.atlas==='A1'?0:6)+Math.floor(shape/8))*48;
      const atlas=(p.atlas==='A1'?pack.atlases.a1:pack.atlases.a2).bytes();
      for(const r of nativeRects(native,p.kind,shape,state))for(let y=0;y<24;y++) {
        const start=((r.sy+y)*768+r.sx)*4;
        data.set(atlas.subarray(start,start+24*4),((dy+r.dy+y)*768+dx+r.dx)*4);
      }
    }
    const bytes=await encodePng(new RgbaImage({width:768,height:576,data})),name=`state-${state}.png`;
    await writeFile(resolve(galleryPath,name),bytes,{flag:'wx'});gallery[name]=hashBytes(bytes);
  }
  await writeFile(resolve(galleryPath,'reference.json'),JSON.stringify({buildId:pack.manifest.buildId,manifestSha256:pack.manifestSha256,files:gallery,scope:'Native CPU shape matrix from actual final PNG, not GUI/visual acceptance'},null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({buildId:pack.manifest.buildId,commit:pack.manifest.identity.context.commit,manifestSha256:pack.manifestSha256,
  atlasHashes:{A1:pack.manifest.identity.files['A1.png']!.sha256,A2:pack.manifest.identity.files['A2.png']!.sha256},coreSha256:PROFILE.coreSha256,
  result:'PASS',tilesChecked:tiles,pixelsChecked:pixels,updatesChecked:updates.length,connectedShapes:47,representativeShape:47,sourceFrames:3,playbackStates:4,
  scope:'Unmodified pinned native Tilemap CPU oracle consuming actual formal Assembly PNG, ACTIVE and RETIRED; not editor/game/GPU/independent Review.',
  gallery,editorDrawing:'NOT_EXECUTED',gameRuntime:'NOT_EXECUTED',independentReview:'NOT_EXECUTED_BY_DESIGN'},null,2));
