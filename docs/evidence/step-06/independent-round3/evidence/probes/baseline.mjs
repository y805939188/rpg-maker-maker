import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
const pg=createRequire(resolve('packages/persistence/package.json'))('pg');
const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
try {await c.query(await readFile('apps/api/prisma/migrations/202610120001_step02_project/migration.sql','utf8'));const r=await c.query('INSERT INTO "Project"(id,name) VALUES($1,$2) RETURNING *',[randomUUID(),'round3-pre-step06-preserved']);const v={...r.rows[0],createdAt:r.rows[0].createdAt.toISOString()};await writeFile('.local/step06-review/formal-workspace/.local/step06/pre-migration-project.json',JSON.stringify(v));await writeFile('.local/step06-review/evidence/baseline-project.json',JSON.stringify(v,null,2)+'\n');console.log('Real additive baseline applied; preserved Project',v.id);}finally{await c.end();}
