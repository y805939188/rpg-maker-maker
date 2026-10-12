import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { RawSource, RgbaImage, validatedDecodedSource, styleProfile, animationClip, frameAt, freezeJson, fingerprint, createRevision, validateTileIR, tileIRHash, buildProcessedAsset, RevisionCatalog, adoptRevision, assessBuild } from '@tileset/asset-core';
import { shorelineRecipe, shorelineParameters, processShoreline } from '@tileset/material-processing';

const art = JSON.parse(readFileSync('packages/material-processing/tests/fixtures/fixed-shoreline.json','utf8'));
const provenance = {origin:'manual',author:'Independent Step03 reviewer',license:'CC0-1.0',toolVersion:'review-repro-v1',parents:[]};
function source(id, role, rows, revision=1) {
 const bytes = new Uint8Array(rows.flat());
 const raw = new RawSource({id,revision,role,density:1,encoding:'rgba8',bytes,provenance});
 return validatedDecodedSource(raw,{width:art.width,height:art.height,data:bytes});
}
function fixture({overlayRows=art.overlay,palette=art.palette,sequence=[0,1,2,1],durations=[30,30,30,30],sameWaterId=false}={}) {
 const grass=source('grass','grass',art.grass,3);
 const waters=art.water.map((rows,i)=>source(sameWaterId?'water':`water-${i}`,'water',rows,sameWaterId?i+1:1));
 const mask=source('mask','static-mask',art.mask,2),overlay=source('bank-detail','bank-overlay',overlayRows);
 const style=styleProfile('style',2,{logicalPixelScale:1,palette,lighting:'flat',outline:'dark'});
 const parameters=shorelineParameters('shore-parameters',4,{geometry:{width:4,height:2,tileWidth:2,tileHeight:2,regions:[{name:'bank-edge',role:'edge',rect:{x:0,y:0,width:2,height:2}},{name:'interior',role:'center',rect:{x:2,y:0,width:2,height:2}}]},animation:{frameCount:3,sequence,durations,timebase:'updates',loop:true},composition:'linear-srgb-source-over',mask:'white-static-bank'});
 const recipe=shorelineRecipe('shore',5,{version:'fixed-shoreline-v1',grass:grass.ref,water:waters.map(s=>s.ref),staticMask:mask.ref,bankOverlay:overlay.ref,style:style.ref,parameters:parameters.ref});
 return {recipe,sources:[grass,...waters,mask,overlay],style,parameters};
}
const baseline=processShoreline(fixture());
assert.deepEqual(baseline.ir.frames.map(p=>Array.from(p.bytes())),art.expected.map(p=>p.flat()));
console.log(JSON.stringify({case:'baseline-independent-literal-pixels',result:'PASS',dependencies:baseline.ir.dependencies.length}));

{
 const input=fixture(),original=buildProcessedAsset(processShoreline(input),'original');
 const partial={...original.ir,dependencies:original.ir.dependencies.filter(ref=>ref.kind!=='parameters')};
 const ir={...partial,contentHash:tileIRHash(partial)};
 validateTileIR(ir);
 const built=buildProcessedAsset({state:'COMPILABLE_RECIPE',ir},'missing-parameters');
 const catalog=new RevisionCatalog(); original.ir.dependencies.forEach(ref=>catalog.publish(ref));
 const next=createRevision('parameters','shore-parameters',5,{...input.parameters.value,animation:{...input.parameters.value.animation,durations:[31,30,30,30]}});
 catalog.publish(next.ref);
 const current=adoptRevision(original.ir.dependencies,next.ref,catalog);
 const missingCatalog=new RevisionCatalog();ir.dependencies.forEach(ref=>missingCatalog.publish(ref));
 console.log(JSON.stringify({case:'parameters-dependency-omission',expected:'REJECT incomplete IR; parameter adoption requires rebuild; absent historical parameters invalid',actualState:built.state,parameterCount:ir.dependencies.filter(r=>r.kind==='parameters').length,completeOriginalNeedsRebuild:assessBuild(original,catalog,current).needsRebuild,truncatedNeedsRebuild:assessBuild(built,catalog,current).needsRebuild,truncatedHistoricalValidity:assessBuild(built,missingCatalog,current).historicalValidity}));
}
{
 const overlayRows=art.overlay.map((p,i)=>i===1?[255,0,0,1]:p);
 // Independent linear-sRGB math gives [44,100,30] over [40,100,30,255].
 const input=fixture({overlayRows,palette:[...art.palette,[44,100,30]]});
 const result=processShoreline(input);
 console.log(JSON.stringify({case:'overlay-source-palette-omission',expected:'REJECT source RGB [255,0,0] absent from exact style palette',actualState:result.state,sourceColorInPalette:input.style.value.palette.some(c=>c.join(',')==='255,0,0'),composedPixel:Array.from(result.ir.frames[0].bytes().slice(4,8))}));
}
{
 const result=processShoreline(fixture({sequence:[0],durations:[30]}));
 const built=buildProcessedAsset(result,'static-playback');
 const played=[0,29,30,60,90].map(t=>result.ir.frames[frameAt(result.ir.animation,t)].pixelHash);
 console.log(JSON.stringify({case:'variation-only-in-unused-frames',expected:'REJECT fixed animated shoreline with no playback interior variation',actualState:built.state,sequence:result.ir.animation.sequence,distinctStoredFrames:new Set(result.ir.frames.map(p=>p.pixelHash)).size,distinctPlayedFrames:new Set(played).size}));
}
{
 const clip=animationClip({frameCount:3,sequence:new Array(1),durations:[30],timebase:'updates',loop:true});
 const value=frameAt(clip,0);
 const built=buildProcessedAsset(processShoreline(fixture({sequence:new Array(1),durations:[30]})),'sparse-sequence');
 const sparse=freezeJson({list:new Array(1)});
 console.log(JSON.stringify({case:'sparse-animation-and-json',expected:'REJECT hole as invalid frame index/non-JSON undefined',actualState:built.state,frameAtType:typeof value,frameAtDefined:value!==undefined,sequenceHasIndex0:0 in clip.sequence,sparseMetadataHasIndex0:0 in sparse.list,sparseEqualsNullHash:fingerprint(sparse)===fingerprint({list:[null]})}));
}
{
 const result=processShoreline(fixture({sameWaterId:true})),built=buildProcessedAsset(result,'same-water-id');
 const catalog=new RevisionCatalog();built.ir.dependencies.forEach(ref=>catalog.publish(ref));
 const assessment=assessBuild(built,catalog,built.ir.dependencies);
 console.log(JSON.stringify({case:'multiple-revisions-one-source-id',expected:'Reject unsupported recipe identity conflict or report no rebuild under identical adoption',actualState:built.state,historicalValidity:assessment.historicalValidity,needsRebuild:assessment.needsRebuild,currentEqualsExactDependencies:true,currentMismatches:assessment.currentMismatches.map(ref=>`${ref.id}@${ref.revision}`)}));
}
