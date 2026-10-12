import { RgbaImage } from '@tileset/asset-core';
import { blank, copyRect } from '@tileset/material-processing';
import { validateFragment } from '@tileset/mz-compiler';
import type { CompiledFragment } from '@tileset/mz-compiler';
import { PROFILE } from '../src/profile.js';

/** Step-01 fixed experimental coordinates only. No search, bindings or slot lifecycle. */
export function fixedDiagnostic(ground:CompiledFragment,water:CompiledFragment) {
  validateFragment(ground);validateFragment(water);
  if(ground.category!=='a2-ground'||water.category!=='a1-water'||ground.source.irHash!==water.source.irHash)throw Error('Diagnostic requires the two fragments of the same processed IR.');
  const a1=blank(768,576),a2=blank(768,576);
  for(const slot of PROFILE.groundSlots)copyRect(ground.image.pixels(),a2,{x:0,y:0,width:96,height:144},slot.x,slot.y);
  for(const slot of PROFILE.waterSlots)copyRect(water.image.pixels(),a1,{x:0,y:0,width:288,height:144},slot.x,slot.y);
  return {a1:new RgbaImage(a1),a2:new RgbaImage(a2)};
}
