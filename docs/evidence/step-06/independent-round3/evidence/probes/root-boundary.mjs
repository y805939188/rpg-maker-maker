import {resolveAssetRoot} from '@tileset/persistence';
import {lstat,mkdir,symlink,writeFile} from 'node:fs/promises';
import {assert,root,resolve,record,randomUUID} from './common.mjs';
const native=resolve('.local/postgres'),pg=await lstat(native),rows=[];
for(const name of ['postgres','Postgres','POSTGRES','pOsTgReS']){
 const path=resolve('.local',name),stat=await lstat(path).catch(()=>undefined);let error;
 try{await resolveAssetRoot({TILESET_ASSET_ROOT:resolve(path,'read-only-absent-assets')});}catch(e){error=e.message;}assert.ok(error);rows.push({name,dev:stat?.dev,ino:stat?.ino,sameIdentity:stat?.dev===pg.dev&&stat?.ino===pg.ino,rejected:true,error});
}
assert.ok(rows.some(r=>r.name!=='postgres'&&r.sameIdentity),'actual case alias required');
const project=resolve(root,'config-fixture-'+randomUUID());await mkdir(resolve(project,'.local/assets'),{recursive:true});await writeFile(resolve(project,'.local/non-directory'),'literal');await symlink(resolve(project,'.local/assets'),resolve(project,'.local/redirect'));
const valid=['.local/assets','.local/absent/new','.local/postgres-assets/absent',resolve(project,'.local/absolute-new')];for(const input of valid)assert.equal(await resolveAssetRoot({TILESET_ASSET_ROOT:input},project),resolve(project,input));assert.equal(await resolveAssetRoot({},project),resolve(project,'.local/assets'));
const invalid=['',' ','.local','../escape','.local/../escape','.local/postgres/x','.local/Postgres/x','.local/POSTGRES/x','.local/redirect/new','.local/non-directory/new'];for(const input of invalid){let error;try{await resolveAssetRoot({TILESET_ASSET_ROOT:input},project);}catch(e){error=e.message;}assert.ok(error);}
await record('root-boundary',{candidate:'c227f8c6ecfe85895937013e4687deb40247a6ee',postgres:{dev:pg.dev,ino:pg.ino},rows,valid,invalid,portableCaseControlsWithoutPostgresDirectory:true,postgresWrites:'NONE_READ_ONLY'});console.log('Actual PostgreSQL dev/ino aliases and portable root controls PASS');
