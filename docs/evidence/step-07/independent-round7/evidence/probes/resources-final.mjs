import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const require=createRequire(resolve('apps/api/package.json'));
const {PrismaClient}=require('@prisma/client');
const owner=JSON.parse(await readFile('.local/postgres/ownership.json','utf8'));
assert.equal(resolve(owner.root),process.cwd());assert.equal(owner.port,55491);
const status=spawnSync('/opt/homebrew/opt/postgresql@14/bin/pg_ctl',['-D',resolve('.local/postgres/data'),'status'],{encoding:'utf8'});assert.equal(status.status,0);
const ports=[];
for(const port of [4391,5291]){const r=spawnSync('lsof',['-nP',`-iTCP:${port}`,'-sTCP:LISTEN'],{encoding:'utf8'});assert.equal(r.stdout.trim(),'');ports.push({port,listener:false,exit:r.status});}
const db=new PrismaClient();
try{
 const databases=await db.$queryRawUnsafe("SELECT datname FROM pg_database WHERE datname LIKE 'tileset_%' ORDER BY datname");
 const activity=await db.$queryRawUnsafe("SELECT datname, state, backend_type FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid()");
 assert.equal(activity.length,0,'No lingering API/test DB clients expected');
 const actual=await db.$queryRawUnsafe("SELECT current_setting('data_directory') AS data, current_setting('port') AS port");
 assert.equal(resolve(actual[0].data),resolve('.local/postgres/data'));assert.equal(actual[0].port,'55491');
 const result={ownedClusterDataVerified:true,PG:55491,pgCtlStatus:status.status,ports,databases,retainedDatabaseCount:databases.length,remainingOtherClients:activity,primaryProjectCount:await db.project.count(),privateData:'Retained; no reset/drop or copied credentials; API/Web/browser operations completed and closed; PG retained for Main safe stop',codingAPI4376PG55476:'NOT_OPERATED'};
 await writeFile('.local/step07-review/evidence/resources-final.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({PG:55491,pgCtlStatus:0,API4391:false,Web5291:false,retainedDatabases:databases.length,remainingOtherClients:activity.length}));
}finally{await db.$disconnect();}
