import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {execFileSync}from'node:child_process';
import {hashBytes}from'@tileset/asset-core';
import {Persistence,archiveDomain}from'@tileset/persistence';
import {PROFILE_HASH}from'@tileset/pack-assembly';
import {PROFILE}from'../../../dist/src/profile.js';
import {makeCompilerFixture}from'../../../dist/scripts/step04-fixture.js';
import {archiveFixture,currentBuildContext}from'../../../dist/scripts/pack-export.js';
import {fragmentsFor,pairOperations}from'../../../dist/scripts/step05-fixture.js';
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Clean frozen candidate required');
const store=new Persistence(process.env.DATABASE_URL,resolve('.local/assets'),PROFILE);
try{
 const fixture=await makeCompilerFixture('art'),project=await store.createProject('step06-bound-'+commit.slice(0,12));
 const domain=await store.saveDomainArchive(project.id,archiveDomain(fixture));
 await store.saveArchives(project.id,[archiveFixture(fixture)]);
 const adopted=await store.adopt(project.id,0,domain.built.ir.dependencies),pack=await store.createPack(project.id,'bound-pack');
 const context=await currentBuildContext(commit,hashBytes(await readFile('pnpm-lock.yaml')));
 const input=await store.prepareBuild(project.id,pack.id,adopted.id,pairOperations('bound',1,fragmentsFor(fixture)),context);
 const published=await store.publish(input),repeated=await store.publish(input),read=await store.readBuild(input.id);
 await store.acceptance(input.id,'STRUCTURAL','PASS',{command:'node --env-file=.env .local/step06/fix-round2/bound-publication.mjs',commit,buildId:input.id,manifestSha:published.manifestSha});
 const server=await store.db.$queryRaw`SELECT current_setting('server_version') AS version`;
 const result={candidate:commit,buildId:input.id,projectId:project.id,projectSnapshotId:adopted.id,packId:pack.id,packVersion:1,publication:published.publication,repeatedBuildId:repeated.id,profileHash:PROFILE_HASH,context,manifestSha256:published.manifestSha,files:Object.fromEntries(Object.entries(read.files).map(([name,bytes])=>[name,{bytes:bytes.length,sha256:hashBytes(bytes)}])),atlases:{a1:read.replay.atlases.a1.pixelHash,a2:read.replay.atlases.a2.pixelHash},processingStages:(await store.db.processingRecord.findMany({where:{projectId:project.id},select:{stage:true,irHash:true}})),postgres:server,port:Number(new URL(store.databaseUrl).port),acceptance:{structural:'PASS',independentReview:'NOT_EXECUTED',MZ:'NOT_EXECUTED',visual:'NOT_EXECUTED'}};
 await writeFile('.local/step06/fix-round2/bound-publication.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({candidate:commit,buildId:input.id,manifestSha256:published.manifestSha,publication:published.publication}));
}finally{await store.close();}
