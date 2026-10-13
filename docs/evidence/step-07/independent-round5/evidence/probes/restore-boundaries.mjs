import assert from 'node:assert/strict';
import {Persistence,restore,verifyBackup,backup} from '@tileset/persistence';
import {readFile,writeFile,mkdir,cp,rename,symlink,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
const {PrismaClient}=await import('../../apps/api/node_modules/@prisma/client/default.js');process.loadEnvFile('.env');
const r=resolve('.local/step07-review'),base=r+'/private/restore-boundaries';await mkdir(base,{recursive:true});
const input=r+'/clean-backup',manifest=(await verifyBackup(input)).manifest,rows=[];
for(const kind of ['input-root','input-parent','input-assets','input-manifest','input-dump']){
 const caseRoot=base+'/'+kind;await mkdir(caseRoot);const clone=caseRoot+'/parent/backup';await cp(input,clone,{recursive:true});
 const path={'input-root':clone,'input-parent':caseRoot+'/parent','input-assets':clone+'/assets','input-manifest':clone+'/manifest.json','input-dump':clone+'/database.dump'}[kind];
 const outside=caseRoot+'/same-content-outside',saved=path+'-preserved';await cp(path,outside,{recursive:true});await rename(path,saved);await symlink(outside,path);
 try{await assert.rejects(verifyBackup(clone))}finally{await rename(path,caseRoot+'/retained-link');await rename(saved,path)}
 assert.deepEqual((await verifyBackup(clone)).manifest,manifest);rows.push({kind,invalidRejected:true,normalVerified:true});
}
const db=new PrismaClient(),name='tileset_r2_bad_restore_'+randomUUID().replaceAll('-','');await db.$executeRawUnsafe(`CREATE DATABASE "${name}"`);const u=new URL(process.env.DATABASE_URL);u.pathname='/'+name;
const parent=base+'/output-parent',outside=base+'/output-outside';await mkdir(outside);await symlink(outside,parent);const resources=JSON.parse(await readFile('apps/api/dist/resources/studio.json','utf8')),store=new Persistence(u.href,parent+'/absent-assets',resources.profile);
try{await assert.rejects(restore(store,input,'/opt/homebrew/opt/postgresql@14/bin'));assert.deepEqual(await readdir(outside),[]);const tables=await store.db.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");assert.equal(tables.length,0);rows.push({kind:'output-parent',invalidRejected:true,outsideFiles:[],database:name,publicTables:0})}finally{await store.close();await db.$disconnect()}
await writeFile(r+'/evidence/restore-boundaries.json',JSON.stringify({realPgBackup:true,rows,originalBackupStillVerified:!!(await verifyBackup(input))},null,2)+'\n');console.log('PASS true-backup root/parent/assets/manifest/dump boundaries, bad restore output parent leaves empty DB/outside root');
