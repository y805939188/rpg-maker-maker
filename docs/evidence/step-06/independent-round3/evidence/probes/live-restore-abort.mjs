import {Persistence,restore} from '@tileset/persistence';
import {execFileSync} from 'node:child_process';
import {assert,root,resolve,readFile,record,PROFILE,pg,pgBin,barrier,delay,terminate,newDatabase} from './common.mjs';
const recovery=JSON.parse(await readFile(resolve(root,'private/recovery-state.json'),'utf8'));
const db=await newDatabase('live_restore_abort',false),assetRoot=resolve(root,'live-restore-abort-assets'),c=new pg.Client({connectionString:db.url});await c.connect();const b=barrier();let store,tx=false;
try {
 // A test-owned non-public event trigger stalls actual pg_restore CREATE TABLE while its
 // single transaction is active. No dump, public table or implementation is replaced.
 await c.query('CREATE SCHEMA review_tools');
 await c.query("CREATE FUNCTION review_tools.block_ddl() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(6020,1); END $$");
 await c.query("CREATE EVENT TRIGGER review_restore_block ON ddl_command_start WHEN TAG IN ('CREATE TABLE') EXECUTE FUNCTION review_tools.block_ddl()");
 await c.query('SELECT pg_advisory_lock(6020,1)');
 store=new Persistence(db.url,assetRoot,PROFILE,async p=>{if(p==='restore-before-db')await b.stop(store.gate.require());});
 const pending=restore(store,recovery.destination,pgBin).then(()=>({ok:true}),e=>({ok:false,error:e.message}));const lease=await b.reached;b.release();
 let backend;
 for(let n=0;n<300;n++){await c.query('SELECT pg_stat_clear_snapshot()');backend=(await c.query("SELECT a.pid,a.application_name,a.xact_start,a.state,l.classid,l.objid FROM pg_stat_activity a JOIN pg_locks l ON l.pid=a.pid WHERE a.datname=current_database() AND a.application_name='pg_restore' AND l.classid=6020 AND l.objid=1 AND NOT l.granted")).rows[0];if(backend)break;await delay(10);}assert.ok(backend,'actual restore transaction lock-wait required');assert.ok(backend.xact_start);
 const lines=execFileSync('ps',['-axo','pid,command'],{encoding:'utf8'}).split('\n').filter(l=>l.includes('/pg_restore ')&&l.includes(db.name)&&l.includes(recovery.destination));assert.equal(lines.length,1);const osPid=Number(lines[0].trim().split(/\s+/)[0]);
 await terminate(c,lease);const result=await pending;assert.equal(result.ok,false);
 assert.equal(execFileSync('ps',['-axo','pid,command'],{encoding:'utf8'}).split('\n').filter(l=>l.includes('/pg_restore ')&&l.includes(db.name)&&l.includes(recovery.destination)).length,0);
 await c.query('SELECT pg_advisory_unlock(6020,1)');for(let n=0;n<100;n++){await c.query('SELECT pg_stat_clear_snapshot()');if(!(await c.query('SELECT 1 FROM pg_stat_activity WHERE pid=$1',[backend.pid])).rowCount)break;await delay(10);}
 assert.equal((await c.query('SELECT 1 FROM pg_stat_activity WHERE pid=$1',[backend.pid])).rowCount,0);
 const tables=(await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).rows;assert.equal(tables.length,0);
 await c.query('DROP EVENT TRIGGER review_restore_block');await c.query('DROP SCHEMA review_tools CASCADE');
 await record('live-restore-abort',{candidate:'c227f8c6ecfe85895937013e4687deb40247a6ee',database:db.name,pgPort:55471,assetRoot,gatePid:lease.backendPid,restoreBackend:backend,restoreProcessPid:osPid,childClosedBeforeReturn:true,backendGoneAfterUnblock:true,result,publicTablesAfterRollback:tables,files:'VALIDATED_DURABLE_UNREFERENCED_PRESERVED',injection:'test-owned non-public event trigger blocks real CREATE TABLE within pg_restore --single-transaction'});console.log('Actual live pg_restore lease-loss abort / close / rollback PASS');
}finally{await c.query('SELECT pg_advisory_unlock_all()').catch(()=>{});await c.end();await store?.close();}
