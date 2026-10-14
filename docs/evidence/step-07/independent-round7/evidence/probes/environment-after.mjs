import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile,writeFile,stat } from 'node:fs/promises';
import { resolve } from 'node:path';
const require=createRequire(resolve('apps/api/package.json'));
const {PrismaClient}=require('@prisma/client');
const repo=process.cwd(),owner=JSON.parse(await readFile('.local/postgres/ownership.json','utf8'));
assert.equal(resolve(owner.root),repo);assert.equal(owner.port,55491);
assert.equal((await stat('.env')).mode&0o777,0o600);
assert.equal(new URL(process.env.DATABASE_URL).port,'55491');
const db=new PrismaClient();
try{
 const actual=await db.$queryRawUnsafe("SELECT current_setting('data_directory') AS data, current_setting('port') AS port, version() AS version");
 assert.equal(resolve(actual[0].data),resolve('.local/postgres/data'));assert.equal(actual[0].port,'55491');
 const tables=await db.$queryRawUnsafe("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'");
 const migrations=await db.$queryRawUnsafe('SELECT migration_name, finished_at IS NOT NULL AS finished FROM "_prisma_migrations" ORDER BY migration_name');
 assert.equal(migrations.length,5);assert.ok(migrations.every(x=>x.finished));
 const projects=await db.project.count();assert.equal(projects,0);
 const result={pgPort:55491,apiPort:4391,webPort:5291,envMode:'0600',ownedDataRootVerified:true,publicTablesAfterMigration:tables[0].n,projects,migrations,node:process.version,pgVersion:actual[0].version,initialLivePublicTableCheck:'NOT_EXECUTED_INITIAL_HELPER_MODULE_RESOLUTION_FAILED',initialMigrationLog:'five previously unapplied migrations applied by this reviewer'};
 await writeFile('.local/step07-review/evidence/environment.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await db.$disconnect();}
