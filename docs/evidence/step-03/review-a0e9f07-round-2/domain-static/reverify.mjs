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
function fixture({overlayRows=art.overlay,palette=art.palette,sequence=[0,1,2,1],durations=[30,30,30,30],sameWaterId=false,waterRows=art.water,timebase='updates',loop=true}={}) {
 const grass=source('grass','grass',art.grass,3);
 const waters=waterRows.map((rows,i)=>source(sameWaterId?'water':`water-${i}`,'water',rows,sameWaterId?i+1:1));
 const mask=source('mask','static-mask',art.mask,2),overlay=source('bank-detail','bank-overlay',overlayRows);
 const style=styleProfile('style',2,{logicalPixelScale:1,palette,lighting:'flat',outline:'dark'});
 const parameters=shorelineParameters('shore-parameters',4,{geometry:{width:4,height:2,tileWidth:2,tileHeight:2,regions:[{name:'bank-edge',role:'edge',rect:{x:0,y:0,width:2,height:2}},{name:'interior',role:'center',rect:{x:2,y:0,width:2,height:2}}]},animation:{frameCount:waters.length,sequence,durations,timebase,loop},composition:'linear-srgb-source-over',mask:'white-static-bank'});
 const recipe=shorelineRecipe('shore',5,{version:'fixed-shoreline-v1',grass:grass.ref,water:waters.map(s=>s.ref),staticMask:mask.ref,bankOverlay:overlay.ref,style:style.ref,parameters:parameters.ref});
 return {recipe,sources:[grass,...waters,mask,overlay],style,parameters};
}
const records = [];
function check(label, fn) {
 try { const details=fn(); records.push({label,result:'PASS',details:details??null}); }
 catch(error){records.push({label,result:'FAIL',error:{name:error.name,code:error.code??null,message:error.message}});}
}
function reject(label,fn,codes){ check(label,()=>{
 let caught;try{fn();}catch(error){caught=error;}
 assert.ok(caught, 'Input was accepted instead of rejected');
 assert.equal(caught.name,'AssetError','Expected concrete domain diagnostic');
 if(codes)assert.ok(codes.includes(caught.code),`Unexpected error code ${caught.code}`);
 return {rejected:true,code:caught.code,message:caught.message};
});}
function rehash(ir){return {...ir,contentHash:tileIRHash(ir)};}
const input=fixture();
const baseline=processShoreline(input);
const built=buildProcessedAsset(baseline,'baseline');
check('control.literal-all-pixel-planes',()=>{
 assert.deepEqual(baseline.ir.frames.map(p=>Array.from(p.bytes())),art.expected.map(p=>p.flat()));
 assert.deepEqual(Array.from(baseline.ir.groundImage.bytes()),art.grass.flat());
 assert.deepEqual(Array.from(baseline.ir.staticMaskImage.bytes()),art.mask.flat());
 assert.equal(built.targetCompilation,'NOT_EXECUTED');
 return {state:built.state,dependencies:baseline.ir.dependencies.length,parameters:baseline.ir.parameters};
});

const validClip={frameCount:3,sequence:[0],durations:[30],timebase:'updates',loop:true};
for(const [name,sequence,durations] of [['sequence-hole',new Array(1),[30]],['duration-hole',[0],new Array(1)],['sequence-undefined',[undefined],[30]],['duration-undefined',[0],[undefined]]]){
 const clip={...validClip,sequence,durations};
 reject('r1-001.'+name+'.clip',()=>animationClip(clip),['ANIMATION']);
 reject('r1-001.'+name+'.frameAt',()=>frameAt(clip,0),['ANIMATION']);
}
const inherited=new Array(1);Object.setPrototypeOf(inherited,{0:0});
reject('r1-001.inherited-sequence',()=>animationClip({...validClip,sequence:inherited}),['ANIMATION']);
for(const [name,value] of [['hole',{list:new Array(1)}],['nested-hole',{nested:[{list:new Array(1)}]}],['undefined',{list:[undefined]}],['inherited',{list:inherited}]]){
 reject('r1-001.json-'+name,()=>freezeJson(value),['INVALID_METADATA']);
 reject('r1-001.fingerprint-'+name,()=>fingerprint(value),['INVALID_METADATA']);
}
check('r1-001.control-dense-json-null-and-canonical-copy',()=>{
 const mutable={list:[null,{b:2,a:1}]},frozen=freezeJson(mutable);
 mutable.list[1].a=9;
 assert.equal(frozen.list[1].a,1);assert.ok(Object.isFrozen(frozen.list[1]));
 assert.equal(fingerprint(frozen),fingerprint({list:[null,{a:1,b:2}]}));
 return {nullPreserved:frozen.list[0]===null,metadataOwned:true};
});
reject('r1-001.sparse-palette-outer',()=>styleProfile('style',1,{logicalPixelScale:1,palette:new Array(1),lighting:'flat',outline:'dark'}),['STYLE']);
const sparseColor=[1,,3];
reject('r1-001.sparse-palette-channels',()=>styleProfile('style',1,{logicalPixelScale:1,palette:[sparseColor],lighting:'flat',outline:'dark'}),['STYLE']);
reject('r1-001.sparse-provenance',()=>new RawSource({id:'source',revision:1,role:'grass',density:1,encoding:'rgba8',bytes:new Uint8Array([1,2,3,255]),provenance:{...provenance,parents:new Array(1)}}),['PROVENANCE']);
const sparseSources=[...input.sources];delete sparseSources[0];
reject('r1-001.sparse-recipe-sources',()=>processShoreline({...input,sources:sparseSources}),['RECIPE_SOURCES']);
reject('r1-001.sparse-recipe-water',()=>shorelineRecipe('shore',6,{...input.recipe.value,water:new Array(3)}),['RECIPE']);
const sparseFrames=[...baseline.ir.frames];delete sparseFrames[1];
reject('r1-001.sparse-ir-frames',()=>validateTileIR({...baseline.ir,frames:sparseFrames}),['IR_FRAMES']);

check('r1-002.control-explicit-parameters-owned-and-hashed',()=>{
 assert.deepEqual(baseline.ir.parameters,input.parameters.ref);
 const next=createRevision('parameters','shore-parameters',5,input.parameters.value);
 assert.notEqual(tileIRHash({...baseline.ir,parameters:next.ref}),baseline.ir.contentHash);
 assert.ok(Object.isFrozen(baseline.ir.parameters));
 return {explicitParametersHashed:true};
});
const truncated=rehash({...baseline.ir,dependencies:baseline.ir.dependencies.filter(r=>r.kind!=='parameters')});
reject('r1-002.omitted-parameter-dependency-ir',()=>validateTileIR(truncated),['IR_DEPENDENCIES']);
reject('r1-002.omitted-parameter-dependency-built',()=>buildProcessedAsset({state:'COMPILABLE_RECIPE',ir:truncated},'truncated'),['IR_DEPENDENCIES']);
const omitted={...baseline.ir};delete omitted.parameters;
reject('r1-002.omitted-parameter-field-ir',()=>validateTileIR(omitted),['IR_PARAMETERS']);
reject('r1-002.omitted-parameter-field-built',()=>buildProcessedAsset({state:'COMPILABLE_RECIPE',ir:omitted},'omitted'),['IR_PARAMETERS']);
const wrongRef=createRevision('parameters','shore-parameters',5,input.parameters.value).ref;
reject('r1-002.wrong-parameter-revision',()=>validateTileIR(rehash({...baseline.ir,parameters:wrongRef})),['IR_DEPENDENCIES']);
reject('r1-002.wrong-parameter-kind',()=>validateTileIR(rehash({...baseline.ir,parameters:input.style.ref})),['IR_PARAMETERS']);
check('r1-002.control-history-current-newer-separation',()=>{
 const incomplete=new RevisionCatalog();baseline.ir.dependencies.filter(r=>r.kind!=='parameters').forEach(r=>incomplete.publish(r));
 assert.equal(assessBuild(built,incomplete,baseline.ir.dependencies).historicalValidity,'MISSING_DEPENDENCY');
 const catalog=new RevisionCatalog();baseline.ir.dependencies.forEach(r=>catalog.publish(r));
 const next=shorelineParameters('shore-parameters',5,{...input.parameters.value,animation:{...input.parameters.value.animation,durations:[31,30,30,30]}});
 catalog.publish(next.ref);
 const unchanged=assessBuild(built,catalog,baseline.ir.dependencies);
 assert.equal(unchanged.historicalValidity,'VALID');assert.equal(unchanged.needsRebuild,false);assert.deepEqual(unchanged.newerAvailable,[next.ref]);
 const adopted=adoptRevision(baseline.ir.dependencies,next.ref,catalog),changed=assessBuild(built,catalog,adopted);
 assert.equal(changed.historicalValidity,'VALID');assert.equal(changed.needsRebuild,true);assert.deepEqual(changed.currentMismatches,[input.parameters.ref]);
 assert.equal(assessBuild(built,catalog,baseline.ir.dependencies).needsRebuild,false);
 assert.equal(processShoreline(input).ir.contentHash,baseline.ir.contentHash);
 return {missingHistorical:'MISSING_DEPENDENCY',newerOnlyNeedsRebuild:false,adoptionNeedsRebuild:true,oldSnapshotUnchanged:true};
});

reject('r1-003.same-source-id-multiple-revisions-recipe',()=>fixture({sameWaterId:true}),['REVISION_IDENTITY_CONFLICT']);
const sameIds=art.water.map((p,i)=>source('water','water',p,i+1));
const forgedRecipe=createRevision('recipe','shore',6,{...input.recipe.value,water:sameIds.map(s=>s.ref)});
reject('r1-003.same-id-bypass-recipe-builder-process',()=>processShoreline({...input,recipe:forgedRecipe,sources:[input.sources[0],...sameIds,...input.sources.slice(4)]}),['REVISION_IDENTITY_CONFLICT']);
const grass4=source('grass','grass',art.grass,4);
const conflict=[...baseline.ir.dependencies,grass4.ref];
const catalog=new RevisionCatalog();baseline.ir.dependencies.forEach(r=>catalog.publish(r));catalog.publish(grass4.ref);
reject('r1-003.same-id-multirev-ir',()=>validateTileIR(rehash({...baseline.ir,dependencies:conflict})),['REVISION_IDENTITY_CONFLICT']);
reject('r1-003.same-id-multirev-adopt',()=>adoptRevision(conflict,grass4.ref,catalog),['REVISION_IDENTITY_CONFLICT']);
reject('r1-003.same-id-multirev-assess',()=>assessBuild(built,catalog,conflict),['REVISION_IDENTITY_CONFLICT']);
reject('r1-003.duplicate-identical-adoption',()=>assessBuild(built,catalog,[...baseline.ir.dependencies,baseline.ir.dependencies[0]]),['REVISION_IDENTITY_CONFLICT']);
check('r1-003.control-catalog-all-versions-adopt-one',()=>{
 assert.ok(catalog.contains(input.sources[0].ref));assert.ok(catalog.contains(grass4.ref));
 assert.equal(assessBuild(built,catalog,baseline.ir.dependencies).needsRebuild,false);
 const adopted=adoptRevision(baseline.ir.dependencies,grass4.ref,catalog);
 assert.equal(adopted.filter(r=>r.kind==='source'&&r.id==='grass').length,1);
 const assessed=assessBuild(built,catalog,adopted);
 assert.equal(assessed.needsRebuild,true);assert.equal(assessed.historicalValidity,'VALID');
 assert.deepEqual(assessed.currentMismatches,[input.sources[0].ref]);
 return {catalogPreservesOldAndNew:true,exactSelfAdoptionNeedsRebuild:false,explicitAdoptionNeedsRebuild:true};
});

const overlayRows=art.overlay.map((p,i)=>i===1?[255,0,0,1]:p);
reject('r1-004.out-palette-overlay-alpha1',()=>processShoreline(fixture({overlayRows,palette:[...art.palette,[44,100,30]]})),['STYLE_PALETTE']);
check('r1-004.control-allowed-partial-overlay-and-composite',()=>{
 const result=processShoreline(fixture({overlayRows,palette:[...art.palette,[44,100,30],[255,0,0]]}));
 assert.deepEqual(Array.from(result.ir.frames[0].bytes().slice(4,8)),[44,100,30,255]);
 assert.equal(result.state,'COMPILABLE_RECIPE');
 return {literalComposite:[44,100,30,255],state:result.state};
});

for(const sequence of [[0],[0,0],[1,1]])reject('r1-005.unplayed-variation-recipe-'+sequence.join('-'),()=>processShoreline(fixture({sequence,durations:sequence.map(()=>30)})),['ANIMATION_STATIC']);
const staticPlayback=rehash({...baseline.ir,animation:{...baseline.ir.animation,sequence:[0],durations:[30]}});
reject('r1-005.unplayed-variation-ir',()=>validateTileIR(staticPlayback),['IR_ANIMATION']);
reject('r1-005.unplayed-variation-built',()=>buildProcessedAsset({state:'COMPILABLE_RECIPE',ir:staticPlayback},'unplayed'),['IR_ANIMATION']);
reject('r1-005.played-equal-pixels-distinct-ref-recipe',()=>processShoreline(fixture({waterRows:[art.water[0],art.water[0],art.water[2]],sequence:[0,1],durations:[30,30]})),['ANIMATION_STATIC']);
const equalPixels=rehash({...baseline.ir,animation:{...baseline.ir.animation,sequence:[0,1],durations:[30,30]},frames:[baseline.ir.frames[0],new RgbaImage(baseline.ir.frames[0].pixels()),baseline.ir.frames[2]]});
reject('r1-005.played-equal-pixels-distinct-ref-ir',()=>validateTileIR(equalPixels),['IR_ANIMATION']);
check('r1-005.control-varied-selected-frames-unused-and-nonloop',()=>{
 const result=processShoreline(fixture({sequence:[0,2],durations:[10,20],loop:false}));
 const output=buildProcessedAsset(result,'varied');
 assert.equal(output.state,'BUILT_ARTIFACT');
 assert.deepEqual(result.ir.frames.map(p=>Array.from(p.bytes())),art.expected.map(p=>p.flat()));
 assert.deepEqual([0,9,10,29,30,999].map(t=>frameAt(result.ir.animation,t)),[0,0,2,2,2,2]);
 return {state:output.state,storedFrames:3,selectedFrames:[0,2],timebase:result.ir.animation.timebase,loop:false};
});
check('r1-005.control-generic-N-five-unused-nonloop-ms',()=>{
 const clip=animationClip({frameCount:5,sequence:[4,2,1],durations:[2,3,4],timebase:'milliseconds',loop:false});
 assert.deepEqual([0,1,2,4,5,8,99].map(t=>frameAt(clip,t)),[4,4,2,2,1,1,1]);
 const result=processShoreline(fixture({waterRows:[art.water[0],art.water[1],art.water[0],art.water[1],art.water[2]],sequence:[4,1],durations:[10,20],timebase:'milliseconds',loop:false}));
 validateTileIR(result.ir);assert.equal(buildProcessedAsset(result,'n-five').state,'BUILT_ARTIFACT');
 return {genericFrames:clip.frameCount,recipeFrames:result.ir.frames.length,sequence:result.ir.animation.sequence,loop:false,timebase:'milliseconds'};
});
check('control.immutable-history-source-pixels-and-metadata',()=>{
 const before=baseline.ir.contentHash;
 input.sources[0].raw.bytes().fill(0);input.sources[0].image.bytes().fill(0);baseline.ir.frames[0].bytes().fill(0);
 assert.equal(tileIRHash(baseline.ir),before);assert.equal(built.artifactHash,before);
 assert.deepEqual(baseline.ir.frames.map(p=>Array.from(p.bytes())),art.expected.map(p=>p.flat()));
 assert.ok(Object.isFrozen(built.ir));assert.ok(Object.isFrozen(built.ir.dependencies));assert.ok(Object.isFrozen(built.ir.parameters));
 return {ownedPixels:true,metadataFrozen:true,historyHashUnchanged:true};
});
for(const record of records)console.log(JSON.stringify(record));
const failures=records.filter(r=>r.result!=='PASS');
console.log(JSON.stringify({summary:{cases:records.length,passed:records.length-failures.length,failed:failures.length,scope:'five R1 domain/recipe defects and scoped regressions only; no full candidate verdict'}}));
if(failures.length)process.exitCode=1;
