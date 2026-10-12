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

const rejects=(id,call,code)=>{assert.throws(call,error=>error.code===code);console.log(JSON.stringify({id,result:'EXPECTED_REJECTION',code}));};
const baseline=processShoreline(fixture());assert.deepEqual(baseline.ir.frames.map(p=>Array.from(p.bytes())),art.expected.map(p=>p.flat()));
rejects('STEP03-R1-001-sequence',()=>animationClip({frameCount:3,sequence:new Array(1),durations:[30],timebase:'updates',loop:true}),'ANIMATION');
rejects('STEP03-R1-001-duration',()=>animationClip({frameCount:3,sequence:[0],durations:new Array(1),timebase:'updates',loop:true}),'ANIMATION');
rejects('STEP03-R1-001-json',()=>fingerprint({list:new Array(1)}),'INVALID_METADATA');
{
 const input=fixture(),built=buildProcessedAsset(processShoreline(input),'complete-build');const partial={...built.ir,dependencies:built.ir.dependencies.filter(r=>r.kind!=='parameters')};
 rejects('STEP03-R1-002-omitted',()=>validateTileIR({...partial,contentHash:tileIRHash(partial)}),'IR_DEPENDENCIES');
 const missing=new RevisionCatalog();partial.dependencies.forEach(r=>missing.publish(r));assert.equal(assessBuild(built,missing,built.ir.dependencies).historicalValidity,'MISSING_DEPENDENCY');
 const catalog=new RevisionCatalog();built.ir.dependencies.forEach(r=>catalog.publish(r));const next=createRevision('parameters','shore-parameters',5,{...input.parameters.value,animation:{...input.parameters.value.animation,durations:[31,30,30,30]}});catalog.publish(next.ref);
 const adopted=assessBuild(built,catalog,adoptRevision(built.ir.dependencies,next.ref,catalog));assert.equal(adopted.needsRebuild,true);assert.equal(adopted.historicalValidity,'VALID');assert.equal(assessBuild(built,catalog,built.ir.dependencies).needsRebuild,false);
 console.log(JSON.stringify({id:'STEP03-R1-002-controls',missingHistorical:'MISSING_DEPENDENCY',ownSnapshotNeedsRebuild:false,explicitParameterAdoptionNeedsRebuild:true,historicalValidity:'VALID',parameters:built.ir.parameters}));
}
rejects('STEP03-R1-003-conflict',()=>processShoreline(fixture({sameWaterId:true})),'REVISION_IDENTITY_CONFLICT');
{const built=buildProcessedAsset(baseline,'own-current');const catalog=new RevisionCatalog();built.ir.dependencies.forEach(r=>catalog.publish(r));assert.equal(assessBuild(built,catalog,built.ir.dependencies).needsRebuild,false);console.log(JSON.stringify({id:'STEP03-R1-003-control',ownSnapshotNeedsRebuild:false}));}
{
 const overlayRows=art.overlay.map((p,i)=>i===1?[255,0,0,1]:p);const palette=[...art.palette,[44,100,30]];
 rejects('STEP03-R1-004-source',()=>processShoreline(fixture({overlayRows,palette})),'STYLE_PALETTE');
 const result=processShoreline(fixture({overlayRows,palette:[...palette,[255,0,0]]}));assert.deepEqual(Array.from(result.ir.frames[0].bytes().slice(4,8)),[44,100,30,255]);console.log(JSON.stringify({id:'STEP03-R1-004-control',allowedSourceAndComposite:true,pixel:[44,100,30,255]}));
}
rejects('STEP03-R1-005-unplayed',()=>processShoreline(fixture({sequence:[0],durations:[30]})),'ANIMATION_STATIC');
{const ir={...baseline.ir,animation:{...baseline.ir.animation,sequence:[0],durations:[30]}};rejects('STEP03-R1-005-IR',()=>validateTileIR({...ir,contentHash:tileIRHash(ir)}),'IR_ANIMATION');}
{const result=processShoreline(fixture({sequence:[0,2],durations:[10,20]}));const built=buildProcessedAsset(result,'reachable-variation');assert.equal(built.state,'BUILT_ARTIFACT');console.log(JSON.stringify({id:'STEP03-R1-005-control',state:built.state,retainedFrameCount:3,reachableSequence:[0,2],literalExpectedUnchanged:true}));}
