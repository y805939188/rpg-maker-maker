import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as core from '@tileset/asset-core';
import * as processing from '@tileset/material-processing';
const art=JSON.parse(fs.readFileSync('packages/material-processing/tests/fixtures/fixed-shoreline.json','utf8'));
const provenance={origin:'manual',author:'Scalar regression synthetic fixture',license:'CC0-1.0',toolVersion:'literal-v1',parents:[]};
const source=(id,role,pixels,revision=1)=>{
 const bytes=new Uint8Array(pixels.flat());
 const raw=new core.RawSource({id,role,revision,density:art.density,encoding:'rgba8',bytes,provenance});
 return core.validatedDecodedSource(raw,{width:art.width,height:art.height,data:bytes});
};
const grass=source('grass','grass',art.grass,3),waters=art.water.map((p,i)=>source('water-'+i,'water',p));
const mask=source('mask','static-mask',art.mask,2),overlay=source('bank-detail','bank-overlay',art.overlay);
const style=core.styleProfile('style',2,{logicalPixelScale:art.density,palette:art.palette,lighting:'flat',outline:'dark'});
const geometry={width:art.width,height:art.height,tileWidth:2,tileHeight:2,regions:[{name:'bank',role:'edge',rect:{x:0,y:0,width:2,height:2}},{name:'water',role:'center',rect:{x:2,y:0,width:2,height:2}}]};
const parameters=processing.shorelineParameters('parameters',4,{geometry,animation:{frameCount:3,sequence:[0,1,2,1],durations:[30,30,30,30],timebase:'updates',loop:true},composition:'linear-srgb-source-over',mask:'white-static-bank'});
const recipe=processing.shorelineRecipe('shore',5,{version:'fixed-shoreline-v1',grass:grass.ref,water:waters.map(s=>s.ref),staticMask:mask.ref,bankOverlay:overlay.ref,style:style.ref,parameters:parameters.ref});
const input={recipe,sources:[grass,...waters,mask,overlay],style,parameters};
const compilable=processing.processShoreline(input),built=core.buildProcessedAsset(compilable,'control');
const results=[];
function check(name,fn){try{fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
function rejects(name,fn,code){check(name,()=>assert.throws(fn,e=>e instanceof core.AssetError && e.code===code));}
const rehash=ir=>({...ir,contentHash:core.tileIRHash(ir)});
check('legal grass/water/shoreline literal pixels',()=>{
 assert.deepEqual([...built.ir.groundImage.bytes()],art.grass.flat());assert.deepEqual(built.ir.frames.map(p=>[...p.bytes()]),art.expected.map(p=>p.flat()));assert.deepEqual([...built.ir.staticMaskImage.bytes()],art.mask.flat());
});
check('legal ID, ownership and artifactHash remains IR content hash',()=>{
 assert.equal(built.id,'control');assert.equal(built.artifactHash,built.ir.contentHash);assert.equal(core.buildProcessedAsset(compilable,'other-id').artifactHash,built.artifactHash);assert.equal(built.targetCompilation,'NOT_EXECUTED');assert.ok(Object.isFrozen(built));assert.ok(Object.isFrozen(built.ir.geometry.regions));grass.raw.bytes().fill(9);grass.image.bytes().fill(9);built.ir.frames[0].bytes().fill(9);assert.deepEqual([...grass.image.bytes()],art.grass.flat());assert.deepEqual([...built.ir.frames[0].bytes()],art.expected[0].flat());
});
const invalids=[['array',['build-one']],['object',{}],['number',1],['boolean',true],['null',null],['missing',undefined]];
for(const [label,id] of invalids)rejects('Built ID '+label,()=>core.buildProcessedAsset(compilable,id),'BUILD_STATE');
for(const id of ['', 'Invalid', 'has space','a'.repeat(65)])rejects('Built ID invalid string '+id,()=>core.buildProcessedAsset(compilable,id),'BUILD_STATE');
const catalog=new core.RevisionCatalog();built.ir.dependencies.forEach(r=>catalog.publish(r));
for(const [label,id] of invalids)rejects('assessBuild ID '+label,()=>core.assessBuild({...built,id},catalog,built.ir.dependencies),'BUILD_STATE');
for(const [label,name] of [['independent arrays',['same']],['object',{}],['number',1],['boolean',true],['null',null],['missing',undefined],['duplicate string','same']]){
 const g={...geometry,regions:geometry.regions.map(r=>{const n=name===undefined?undefined:Array.isArray(name)?[...name]:name;const v={...r,name:n};if(n===undefined)delete v.name;return v;})};
 rejects('geometry names '+label,()=>core.geometry(g),'GEOMETRY');
 if(name!==undefined){
  const value={...parameters.value,geometry:g};
  rejects('shorelineParameters names '+label,()=>processing.shorelineParameters('parameters',5,value),'GEOMETRY');
  const malformed=core.createRevision('parameters','parameters',5,value);
  const bound=processing.shorelineRecipe('shore',6,{...recipe.value,parameters:malformed.ref});
  rejects('processShoreline names '+label,()=>core.buildProcessedAsset(processing.processShoreline({...input,parameters:malformed,recipe:bound}),'bad-names'),'GEOMETRY');
 }
}
for(const surface of ['ground','water'])for(const [label,opaque] of [['string','false'],['number',1],['array',[]],['object',{}],['false',false],['null',null],['missing',undefined]]){
 const value={...built.ir[surface],opaque};if(opaque===undefined)delete value.opaque;
 const ir=rehash({...built.ir,[surface]:value});
 assert.equal(ir.contentHash,core.tileIRHash(ir));
 rejects(surface+'.opaque '+label+' hard IR',()=>core.validateTileIR(ir),'IR_SEMANTICS');
 rejects(surface+'.opaque '+label+' Built',()=>core.buildProcessedAsset({state:'COMPILABLE_RECIPE',ir},'bad-opaque'),'IR_SEMANTICS');
}
for(const surface of ['ground','water']){
 const pixels=(surface==='ground'?built.ir.groundImage:built.ir.frames[0]).pixels();pixels.data[3]=128;const image=new core.RgbaImage(pixels);
 const ir=rehash(surface==='ground'?{...built.ir,groundImage:image}:{...built.ir,frames:[image,...built.ir.frames.slice(1)]});
 rejects(surface+' alpha still checked with opaque=true',()=>core.buildProcessedAsset({state:'COMPILABLE_RECIPE',ir},'bad-alpha'),'IR_ALPHA');
}
check('source frames and 0/1/2/1 playback remain distinct',()=>assert.deepEqual([0,29,30,59,60,89,90,119,120].map(t=>core.frameAt(built.ir.animation,t)),[0,0,1,1,2,2,1,1,0]));
check('generic loop=false remains legal',()=>assert.equal(core.animationClip({...parameters.value.animation,loop:false}).loop,false));
for(const loop of ['false',1,[],{}])rejects('loop scalar '+JSON.stringify(loop),()=>core.animationClip({...parameters.value.animation,loop}),'ANIMATION');
rejects('sparse metadata retained',()=>core.fingerprint({list:new Array(1)}),'INVALID_METADATA');
rejects('sparse animation retained',()=>core.animationClip({...parameters.value.animation,sequence:new Array(4)}),'ANIMATION');
rejects('parameter closure retained after rehash',()=>core.validateTileIR(rehash({...built.ir,dependencies:built.ir.dependencies.filter(r=>r.kind!=='parameters')})),'IR_DEPENDENCIES');
rejects('reachable frame variation retained after rehash',()=>core.validateTileIR(rehash({...built.ir,animation:{...built.ir.animation,sequence:[0],durations:[30]}})),'IR_ANIMATION');
check('grass4 availability / adoption / grass3 history',()=>{
 const next=source('grass','grass',art.grass,4);catalog.publish(next.ref);assert.equal(core.assessBuild(built,catalog,built.ir.dependencies).needsRebuild,false);const assessment=core.assessBuild(built,catalog,core.adoptRevision(built.ir.dependencies,next.ref,catalog));assert.equal(assessment.historicalValidity,'VALID');assert.equal(assessment.needsRebuild,true);assert.equal(processing.processShoreline(input).ir.contentHash,built.artifactHash);
});
const summary={productionPackageExports:true,total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
console.log(JSON.stringify(summary,null,2));if(summary.failed)process.exitCode=1;
