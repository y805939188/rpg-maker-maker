import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {randomUUID} from 'node:crypto';import {execFileSync} from 'node:child_process';import {StudioService} from '../../apps/api/dist/studio-service.js';import {parseConfig} from '../../apps/api/dist/config.js';import {RefSchema} from '@tileset/persistence';
const {PrismaClient}=await import('../../apps/api/node_modules/@prisma/client/default.js');process.loadEnvFile('.env');const admin=new PrismaClient(),name='tileset_review5_metadata_'+randomUUID().replaceAll('-','');await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);const u=new URL(process.env.DATABASE_URL);u.pathname='/'+name;execFileSync('pnpm',['--filter','@tileset/api','exec','prisma','migrate','deploy'],{env:{...process.env,DATABASE_URL:u.href},stdio:'pipe'});
const resources=JSON.parse(await readFile('apps/api/dist/resources/studio.json','utf8')),srv=new StudioService(parseConfig({...process.env,DATABASE_URL:u.href,NODE_ENV:'production'}),resources,resolve('.local/step07-review/metadata-extra-assets')),store=srv.store,log={source:resources.context.commit,database:name,phases:[]};
try{
const p=await store.createProject('R5 adoption race'),saved=await store.saveArchives(p.id,[resources.presets.art]);await store.adopt(p.id,0,saved.records[0].built.ir.dependencies);const original=srv.project.bind(srv),rid=(await store.db.assetRevision.findFirstOrThrow({where:{projectId:p.id,kind:'recipe'}})).id;
const first=await srv.enqueue(p.id,{recipeId:rid,expectedRevision:1,mode:'update'});for(let n=0;n<300;n++){const j=await store.db.studioJob.findUniqueOrThrow({where:{id:first.id}});if(j.state==='COMPLETED')break;assert.notEqual(j.state,'FAILED');await new Promise(r=>setTimeout(r,100))}
for(const kind of ['adoption-commit','upload-and-recipe-commit']){
 const before=await srv.state(p.id);let captured,release;const got=new Promise(r=>captured=r),gate=new Promise(r=>release=r);let arm=true;
 srv.project=async(...args)=>{const row=await original(...args);if(arm&&args[0]===p.id&&args[1]){arm=false;captured(row);await gate}return row};
 const pending=srv.state(p.id);await got;
 if(kind==='adoption-commit'){const s=await store.projectSnapshot(p.id);await store.adopt(p.id,s.revision,RefSchema.array().parse(s.adoption))}
 else{await srv.upload(p.id,'grass',2,Buffer.from(resources.presets.art.sources[0].png,'base64'),new AbortController().signal);const s=await srv.state(p.id);await srv.recipe(p.id,{expectedRevision:s.revision,sources:Object.fromEntries(['grass','water-0','water-1','water-2','mask','overlay'].map(c=>[c,s.sources.find(x=>x.component===c).id])),style:'component-palette'})}
 release();const across=await pending;srv.project=original;const fresh=await srv.state(p.id);assert.deepEqual(across,before);assert.equal(fresh.revision,before.revision+1);assert.equal(fresh.successfulBuildId,before.successfulBuildId);assert.equal(fresh.needsRebuild,true);if(kind==='upload-and-recipe-commit'){assert.equal(fresh.sources.length,before.sources.length+1);assert.notEqual(fresh.recipes.find(x=>x.current).id,before.recipes.find(x=>x.current).id)}
 log.phases.push({kind,before,across,fresh,consistentWholeSnapshot:true})
}
log.result='PASS';
}finally{await writeFile('.local/step07-review/evidence/metadata-extra.json',JSON.stringify(log,null,2)+'\n');await srv.close();await admin.$disconnect()}
console.log('PASS actual adoption and source/recipe COMMIT preserve entire short read snapshot, fresh current/rebuild semantics');
