import { RawSource, RgbaImage, buildProcessedAsset, styleProfile } from '@tileset/asset-core';
import { decodeSource, encodePng } from '@tileset/image-adapter';
import { processShoreline, shorelineParameters, shorelineRecipe } from '@tileset/material-processing';
import { compileFragment } from '@tileset/mz-compiler';
import type { Operation } from '@tileset/pack-assembly';
import type { makeCompilerFixture } from './step04-fixture.js';

type Fixture = Awaited<ReturnType<typeof makeCompilerFixture>>;
/** Explicit new fixture revisions; old independently authored masters remain untouched. */
export async function variantFixture(base: Fixture, label: string, revision: number, rotate: boolean) {
  const sources = [], palette = new Map<string,[number,number,number]>();
  for (const old of base.sources) {
    const bytes = old.image.bytes();
    for (let i=0;i<bytes.length;i+=4) if (old.raw.role !== 'static-mask' && bytes[i+3]) {
      if(rotate) {const r=bytes[i]!; bytes[i]=bytes[i+2]!; bytes[i+2]=bytes[i+1]!; bytes[i+1]=r;}
      palette.set(`${bytes[i]},${bytes[i+1]},${bytes[i+2]}`,[bytes[i]!,bytes[i+1]!,bytes[i+2]!]);
    }
    const result = await decodeSource(new RawSource({id:`${label}-${old.raw.role === 'water' ? old.ref.id.split('-').slice(-2).join('-') : old.raw.role}`,
      revision,role:old.raw.role,density:old.raw.density,encoding:'png',bytes:await encodePng(new RgbaImage({width:96,height:144,data:bytes})),
      provenance:{origin:'deterministic',author:'AI Tileset Studio step05 fixture',license:'CC0-1.0',toolVersion:'step05-variant-v1',parents:[old.ref]}}));
    if(result.status !== 'validated')throw Error(result.diagnostic.code); sources.push(result.source);
  }
  const style = styleProfile(`${label}-style`,revision,{...base.style.value,palette:[...palette.values()]});
  const parameters = shorelineParameters(`${label}-parameters`,base.parameters.ref.revision+revision,base.parameters.value);
  const recipe = shorelineRecipe(`${label}-recipe`,base.recipe.ref.revision+revision,{...base.recipe.value,grass:sources[0]!.ref,water:sources.slice(1,4).map(s=>s.ref),staticMask:sources[4]!.ref,bankOverlay:sources[5]!.ref,style:style.ref,parameters:parameters.ref});
  const built = buildProcessedAsset(processShoreline({sources,style,parameters,recipe}),`${label}-processed`);
  return {sources,style,parameters,recipe,built};
}
export function fragmentsFor(f: Pick<Fixture,'built'>) {
  return [compileFragment(f.built.ir,'a2-ground'),compileFragment(f.built.ir,'a1-water')] as const;
}
export function pairOperations(label: string, revision: number, fragments: ReturnType<typeof fragmentsFor>): Operation[] {
  return [{operation:'put',logicalId:`${label}-ground`,revision,fragmentHash:fragments[0].contentHash,groundId:null},
    {operation:'put',logicalId:`${label}-water`,revision,fragmentHash:fragments[1].contentHash,groundId:`${label}-ground`}];
}
