import { strict as assert } from 'node:assert';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { decodePng } from '../src/pixels.js';
import { PROFILE,sourceFrameAtUpdate } from '../src/profile.js';
import { sha256,readJson } from './io.js';
import { loadNativeOracle,nativeRects,nativeUpdates } from './mz-oracle.js';

const [corePath,buildPath] = process.argv.slice(2);
if (!corePath || !buildPath) throw new Error('Usage: pnpm verify:mz <rmmz_core.js> <immutable build directory>');
const native = await loadNativeOracle(corePath);
interface Manifest { buildId:string; commit:string; profile:typeof PROFILE; files:Record<string,string>; sources:Record<string,string> }
const manifest = await readJson<Manifest>(resolve(buildPath,'manifest.json'));
assert.deepEqual(manifest.profile,PROFILE);
for (const [name,hash] of Object.entries(manifest.files)) assert.equal(sha256(await readFile(resolve(buildPath,name))),hash);
for (const [name,hash] of Object.entries(manifest.sources)) assert.equal(sha256(await readFile(`tests/fixtures/${name}`)),hash);
assert.equal(native.FLOOR_AUTOTILE_TABLE.length,48);
let tilesChecked = 0,pixelsChecked = 0;
for (const family of ['diagnostic','art']) {
  const a1 = await decodePng(await readFile(resolve(buildPath,`${family}_A1.png`)));
  const a2 = await decodePng(await readFile(resolve(buildPath,`${family}_A2.png`)));
  for (const slot of [...PROFILE.groundSlots,...PROFILE.waterSlots]) {
    const isWater = slot.kind < 16;
    for (let frame=0;frame<(isWater?4:1);frame++) {
      const f = PROFILE.animation.sequence[frame]!;
      const fixture = await decodePng(await readFile(`tests/fixtures/${family}-${isWater?`water-${f}`:'ground'}.png`));
      for (let shape=0;shape<48;shape++) {
        const rects = nativeRects(native,slot.kind,shape,frame);
        assert.equal(rects.length,4);
        rects.forEach((r,i)=>{
          const q = native.FLOOR_AUTOTILE_TABLE[shape]![i]!;
          assert.equal(r.set,isWater?0:1);
          assert.deepEqual([r.dx,r.dy,r.w,r.h],[(i%2)*24,Math.floor(i/2)*24,24,24]);
          assert.deepEqual([r.sx,r.sy],[slot.x+(isWater?f*96:0)+q[0]!*24,slot.y+q[1]!*24]);
          const atlas = isWater?a1:a2;
          for (let y=0;y<24;y++) for (let x=0;x<24;x++) {
            const actual = ((r.sy+y)*atlas.width+r.sx+x)*4;
            const expected = ((q[1]!*24+y)*fixture.width+q[0]!*24+x)*4;
            assert.deepEqual(atlas.data.subarray(actual,actual+4),fixture.data.subarray(expected,expected+4));
            pixelsChecked++;
          }
        });
        tilesChecked++;
      }
    }
  }
}
const updates = nativeUpdates(native,240);
for (const s of updates) {
  assert.equal(s.animationFrame,Math.floor(s.animationCount/30));
  assert.equal(PROFILE.animation.sequence[s.animationFrame%4],sourceFrameAtUpdate(s.animationCount));
}
const report = {
  buildId:manifest.buildId,commit:manifest.commit,profile:PROFILE.version,
  manifestSha256:sha256(await readFile(resolve(buildPath,'manifest.json'))),
  coreSha256:PROFILE.coreSha256,engineVersion:PROFILE.engineVersion,
  result:'PASS',scope:'Unmodified native Tilemap rectangle selection + exact pixels, executed in Node VM with stub layer; not GPU rendering, not editor drawing, not game play',
  shapes:48,tilesChecked,pixelsChecked,updatesChecked:updates.length,
  sampleUpdates:[0,29,30,59,60,89,90,119,120,240].map(n=>({update:n,frame:sourceFrameAtUpdate(n)})),
  editorDrawing:'NOT_EXECUTED',gameRuntime:'NOT_EXECUTED',
};
await mkdir('.local/evidence',{recursive:true});
await writeFile(`.local/evidence/${manifest.buildId}-native-oracle.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
