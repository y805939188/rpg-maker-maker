import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,symlink} from 'node:fs/promises';
import {resolve} from 'node:path';import {randomUUID} from 'node:crypto';import {execFileSync} from 'node:child_process';import ts from 'typescript';
import {Persistence,RefSchema} from '@tileset/persistence';
import {StudioService} from '../../apps/api/dist/studio-service.js';import {parseConfig} from '../../apps/api/dist/config.js';import {hashBytes} from '@tileset/asset-core';import {assembleExport} from '@tileset/pack-export';
const {PrismaClient}=await import('../../apps/api/node_modules/@prisma/client/default.js');process.loadEnvFile('.env');
const admin=new PrismaClient(),name='tileset_review5_finaltx_'+randomUUID().replaceAll('-','');await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
const u=new URL(process.env.DATABASE_URL);u.pathname='/'+name;execFileSync('pnpm',['--filter','@tileset/api','exec','prisma','migrate','deploy'],{env:{...process.env,DATABASE_URL:u.href},stdio:'pipe'});
const res=JSON.parse(await readFile('apps/api/dist/resources/studio.json','utf8')),root=resolve('.local/step07-review/finalization-extra-assets'),srv=new StudioService(parseConfig({...process.env,DATABASE_URL:u.href,NODE_ENV:'production'}),res,root),store=srv.store;
const olddir=resolve('.local/step07-review/finalization-extra-legacy');await mkdir(olddir);await writeFile(olddir+'/package.json','{"type":"module"}');await symlink(resolve('packages/persistence/node_modules'),olddir+'/node_modules');
for(const n of ['store','storage','gate','domain','replay','config'])await writeFile(olddir+'/'+n+'.js',ts.transpileModule(execFileSync('git',['show','c227f8c6ecfe85895937013e4687deb40247a6ee:packages/persistence/src/'+n+'.ts'],{encoding:'utf8'}),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {Persistence:Legacy}=await import(olddir+'/store.js');const ext=new Legacy(u.href,root,res.profile);const log={source:res.context.commit,database:name,scenarios:[]};let release;
const terminal=async(id)=>{for(let n=0;n<300;n++){const j=await store.db.studioJob.findUniqueOrThrow({where:{id}});if(['COMPLETED','FAILED'].includes(j.state))return j;await new Promise(r=>setTimeout(r,100))}throw Error('30s terminal budget')};
try{
const p=await store.createProject('R5 actual deferred existing completion'),s=await store.saveArchives(p.id,[res.presets.art]);await store.adopt(p.id,0,s.records[0].built.ir.dependencies);const rid=(await store.db.assetRevision.findFirstOrThrow({where:{projectId:p.id,kind:'recipe'}})).id;
const first=await srv.enqueue(p.id,{recipeId:rid,expectedRevision:1,mode:'update'}),normal=await terminal(first.id);assert.equal(normal.state,'COMPLETED');const oldExport=await store.readExport(normal.buildId),oldSHA=hashBytes(oldExport.files['manifest.json']);
const original=store.prepareBuild.bind(store);let made;const ready=new Promise(r=>made=r),gate=new Promise(r=>release=r);store.prepareBuild=async(...a)=>{const v=await original(...a);made(v);await gate;return v};
const job=await srv.enqueue(p.id,{recipeId:rid,expectedRevision:1,mode:'update'}),prepared=await ready;
// Move adoption with the same immutable dependencies; old prepared result is genuinely history-only.
const snap=await store.projectSnapshot(p.id);await store.adopt(p.id,1,RefSchema.array().parse(snap.adoption));await ext.publish(prepared);
assert.equal(await store.db.finalExport.count({where:{buildId:prepared.id}}),0);const before=await store.db.project.findUniqueOrThrow({where:{id:p.id}}),internal=hashBytes((await store.storage.buildFiles(prepared.id))['manifest.json']);assert.equal(before.successfulBuildId,normal.buildId);
await store.db.$executeRawUnsafe(`CREATE FUNCTION review5_deferred_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id = '${job.id}' AND NEW.state = 'COMPLETED' THEN RAISE EXCEPTION 'REVIEW5_EXPECTED_DEFERRED_COMMIT_REJECTION'; END IF; RETURN NEW; END $$`);
await store.db.$executeRawUnsafe('CREATE CONSTRAINT TRIGGER review5_deferred AFTER UPDATE ON "StudioJob" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION review5_deferred_failure()');
release();const failed=await terminal(job.id);assert.equal(failed.state,'FAILED');assert.equal(await store.db.finalExport.count({where:{buildId:prepared.id}}),0);assert.deepEqual(await store.db.project.findUniqueOrThrow({where:{id:p.id}}),before);assert.equal(hashBytes((await store.readExport(normal.buildId)).files['manifest.json']),oldSHA);assert.equal(hashBytes((await store.storage.buildFiles(prepared.id))['manifest.json']),internal);
log.scenarios.push({name:'actual deferred COMMIT rejection in existing internal branch',job:failed,exportCount:0,lastsuccess:before.successfulBuildId,internalSHA256:internal});
await store.db.$executeRawUnsafe('DROP TRIGGER review5_deferred ON "StudioJob"');await store.db.$executeRawUnsafe('DROP FUNCTION review5_deferred_failure()');
const bundle=JSON.parse(new TextDecoder().decode(prepared.files['bundle.json'])),standard=await assembleExport(res.profile,bundle,res.context);await store.publish(prepared,standard.files);await store.publish(prepared,standard.files);
assert.equal(await store.db.finalExport.count({where:{buildId:prepared.id}}),1);assert.equal((await store.db.studioJob.findUniqueOrThrow({where:{id:job.id}})).state,'FAILED');assert.deepEqual(await store.db.project.findUniqueOrThrow({where:{id:p.id}}),before);
log.scenarios.push({name:'idempotent append after rollback keeps original failed Job and history-only pointer',exportCount:1,standardFiles:Object.keys((await store.readExport(prepared.id)).files).sort()});store.prepareBuild=original;
const next=await srv.enqueue(p.id,{recipeId:rid,expectedRevision:2,mode:'update'});assert.equal((await terminal(next.id)).state,'COMPLETED');log.result='PASS';
}finally{release?.();await writeFile('.local/step07-review/evidence/finalization-extra.json',JSON.stringify(log,null,2)+'\n');await srv.close();await ext.close();await admin.$disconnect()}
console.log('PASS actual deferred COMMIT existing branch, history-only, rollback, explicit append, fresh completion');
