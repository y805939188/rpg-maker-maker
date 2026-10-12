import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const pg=createRequire(resolve('packages/persistence/package.json'))('pg');
const name='tileset_fix_r2_probe_'+randomUUID().replaceAll('-',''),url=new URL(process.env.DATABASE_URL);
if(url.hostname!=='127.0.0.1'||url.port!=='55466')throw Error('Owned PG55466 required');
const client=new pg.Client({connectionString:url.href});await client.connect();
try{await client.query(`CREATE DATABASE "${name}"`);}finally{await client.end();}
url.pathname='/'+name;
const log=execFileSync('pnpm',['--filter','@tileset/api','exec','prisma','migrate','deploy','--schema','prisma/schema.prisma'],{env:{...process.env,DATABASE_URL:url.href},encoding:'utf8'});
await writeFile('.local/step06/fix-round2/probes/private/migration.log',log);
await writeFile('.local/step06/fix-round2/probes/private/independent-env.json',JSON.stringify({url:url.href,assetRoot:resolve('.local/step06/fix-round2/probes/private/assets')})+'\n',{mode:0o600});
await writeFile('.local/step06/fix-round2/probes/evidence/owned-environment.json',JSON.stringify({database:name,port:55466,assetRoot:'.local/step06/fix-round2/probes/private/assets',origin:'new empty database migrated; own coding instance; no reset',credentials:'PRIVATE_NOT_EXPORTED'},null,2)+'\n');
console.log('Owned empty probe database migrated; credentials remain private');
