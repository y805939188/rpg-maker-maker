import assert from 'node:assert/strict';
import { readFile,writeFile,stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
const repo=process.cwd();
const owner=JSON.parse(await readFile('.local/postgres/ownership.json','utf8'));
assert.equal(resolve(owner.root),repo);assert.equal(owner.port,55491);
assert.equal((await stat('.env')).mode&0o777,0o600);
const pg=spawnSync('/opt/homebrew/opt/postgresql@14/bin/pg_ctl',['-D',resolve('.local/postgres/data'),'status'],{encoding:'utf8'});
assert.equal(pg.status,0);
const db=new PrismaClient();
try{
 const actual=await db.$queryRawUnsafe("SELECT current_setting('data_directory') AS data, current_setting('port') AS port, version() AS version");
 assert.equal(resolve(actual[0].data),resolve('.local/postgres/data'));assert.equal(actual[0].port,'55491');
 const tables=await db.$queryRawUnsafe("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'");
 assert.equal(tables[0].n,0,'Main preparation must leave new main DB empty');
 const result={pgPort:55491,apiPort:4391,webPort:5291,envMode:'0600',ownedDataRootVerified:true,publicTables:0,node:process.version,pgVersion:actual[0].version,pgCtlStatus:pg.status};
 await writeFile('.local/step07-review/evidence/environment.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await db.$disconnect();}
