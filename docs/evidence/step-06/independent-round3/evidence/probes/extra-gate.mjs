import {AsyncLocalStorage} from 'node:async_hooks';
import {Persistence,GateLostError} from '@tileset/persistence';
import {assert,root,resolve,readFile,record,PROFILE,pg,barrier,terminate,delay,newDatabase,randomUUID} from './common.mjs';
const env=JSON.parse(await readFile(resolve(root,'private/independent-env.json'),'utf8'));
const store=new Persistence(env.url,env.assetRoot,PROFILE),other=new Persistence(env.url,env.assetRoot,PROFILE);
const u=new URL(env.url);u.protocol='postgres:';const rebuilt=new Persistence(u.href,env.assetRoot,PROFILE);
const c=new pg.Client({connectionString:env.url});await c.connect();const checks=[];
const result=p=>p.then(value=>({ok:true,value}),error=>({ok:false,error:error.message,name:error.name}));
let cross;
try {
 await store.gate.write(async parent=>{
  assert.equal(other.gate.current(),parent);assert.equal(rebuilt.gate.current(),parent);
  await other.gate.write(async child=>{
   await rebuilt.gate.write(async grand=>{
    for(const scope of [parent.scope,child.scope,grand.scope]){const r=await result(store.gate.write(async()=>{},scope));assert.equal(r.ok,false);assert.match(r.error,/reentry/);}
    assert.equal((await result(store.gate.pause(async()=>{}))).ok,false);
    await grand.checkpoint();
    await store.createProject('extra-triple-normal');
   },'triple-grand');assert.equal(child.signal.aborted,false);
  },'triple-child');assert.equal(parent.signal.aborted,false);
 },'triple-parent');checks.push({name:'three-level-cross-instance-normal-and-all-ancestor-reentry',pass:true});
 // Independent call chains remain independent, including identical scopes after normal serialization.
 const b=barrier();let firstLease;const first=store.gate.write(async l=>{firstLease=l;await b.stop(l);},'independent-scoped');await b.reached;
 const independent=await other.createProject('extra-independent-live');assert.ok(independent.id);assert.equal(firstLease.signal.aborted,false);b.release();await first;
 checks.push({name:'independent-async-call-chain',pass:true});
 // Cross-database lifetimes are deliberately separate; same-database reconstruction is not an escape.
 const db=await newDatabase('identity');cross=new Persistence(db.url,resolve(root,'cross-db-assets'),PROFILE);
 const b2=barrier();let afterName='extra-after-loss-'+randomUUID(),crossId;const p=result(store.gate.write(async parent=>{await b2.stop(parent);assert.equal((await result(rebuilt.createProject(afterName))).ok,false);crossId=(await cross.createProject('extra-cross-db-independent')).id;},'identity-parent'));
 const parent=await b2.reached;await terminate(c,parent);b2.release();assert.equal((await p).ok,false);assert.equal(await store.db.project.count({where:{name:afterName}}),0);assert.ok(await cross.db.project.findUnique({where:{id:crossId}}));
 checks.push({name:'lost-parent-same-db-protocol-reconstruction-vs-cross-db',sameDatabaseRejected:true,differentDatabaseCommitted:true,crossDb:db.name});
 // Old context after normal completion cannot open fresh children. No-awaited started children stop too.
 let late;await store.gate.write(async()=>{const capture=AsyncLocalStorage.snapshot();late=()=>capture(()=>other.createProject('extra-expired-context'));});assert.match((await result(late())).error,/lifetime ended/);
 const b3=barrier();let descendant,child,parent3,newCount=0;
 await store.gate.write(async p=>{parent3=p;descendant=result(other.gate.write(async l=>{child=l;await b3.stop(l);await l.checkpoint();newCount++;await other.createProject('extra-unawaited-child');},'unawaited-child'));await b3.reached;},'unawaited-parent');
 assert.equal(child.signal.aborted,true);assert.equal(child.signal.reason.name,'GateEndedError');assert.equal(child.signal.reason instanceof GateLostError,false);b3.release();assert.equal((await descendant).ok,false);assert.equal(newCount,0);await delay(100);assert.equal(await store.db.project.count({where:{name:'extra-unawaited-child'}}),0);
 // A queued-but-not-active child under an ordinary writer must be cancelled when its parent ends.
 const block=barrier();const blocker=other.gate.write(async l=>{await block.stop(l);},'blocked-child');await block.reached;let queued;
 await store.gate.write(async()=>{queued=result(store.gate.write(async()=>{newCount++;},'blocked-child'));await delay(50);},'short-parent');assert.equal((await queued).ok,false);block.release();await blocker;assert.equal(newCount,0);
 checks.push({name:'normal-end-expired-context-running-and-scope-queued-unawaited-child',noBackgroundActions:true});
 // Maintenance queued writes are the explicit exception, and do start after normal release.
 const mb=barrier();let queuedInside;const maintenance=store.gate.pause(async()=>{queuedInside=result(other.createProject('extra-maintenance-inside-queue'));await mb.stop(store.gate.require());});await mb.reached;let outsideDone=false;const outside=result(rebuilt.createProject('extra-maintenance-outside-queue')).then(r=>{outsideDone=true;return r;});await delay(50);assert.equal(outsideDone,false);mb.release();await maintenance;assert.equal((await queuedInside).ok,true);assert.equal((await outside).ok,true);checks.push({name:'normal-maintenance-queue-inside-and-independent-outside',pass:true});
 // If maintenance is already waiting on the parent, new different-scope nesting must not self-deadlock.
 const wb=barrier();let releaseChild;const wp=store.gate.write(async()=>{await wb.stop(store.gate.require());const out=await result(other.gate.write(async()=>{},'nested-after-maintenance-wait'));assert.equal(out.ok,false);assert.match(out.error,/queued maintenance/);},'maintenance-wait-parent');await wb.reached;const maintenanceNext=result(rebuilt.gate.pause(async()=>true));let waiting=false;
 for(let n=0;n<100;n++){const q=await c.query("SELECT 1 FROM pg_locks WHERE database=(SELECT oid FROM pg_database WHERE datname=current_database()) AND classid=6006 AND objid=0 AND mode='ExclusiveLock' AND NOT granted");if(q.rowCount){waiting=true;break;}await delay(10);}assert.equal(waiting,true);wb.release();await wp;assert.equal((await maintenanceNext).ok,true);checks.push({name:'different-scope-reject-behind-waiting-maintenance-without-deadlock',pass:true});
 // Three ancestors and leaf all fence a real transaction, including unscoped layers.
 const fb=barrier();const scopes=['fence-outer-'+randomUUID(),'fence-middle-'+randomUUID(),'fence-leaf-'+randomUUID()];let outer,leaf;
 const txp=result(store.gate.write(async l=>{outer=l;await other.gate.write(async()=>{await rebuilt.gate.write(async()=>{await store.gate.write(async l=>{leaf=l;await store.db.$transaction(async tx=>{await l.fence(tx);await tx.project.create({data:{name:'extra-multilevel-rollback'}});await fb.stop(l);await l.checkpoint();},{timeout:30000});},scopes[2]);},scopes[1]);},undefined);},scopes[0]));await fb.reached;
 await terminate(c,outer);assert.equal(leaf.signal.aborted,true);
 for(const scope of scopes)assert.equal((await c.query('SELECT pg_try_advisory_lock(6008,hashtext($1)) AS locked',[scope])).rows[0].locked,false);
 assert.equal((await c.query('SELECT pg_try_advisory_lock(6006,0) AS locked')).rows[0].locked,false);fb.release();assert.equal((await txp).ok,false);assert.equal(await store.db.project.count({where:{name:'extra-multilevel-rollback'}}),0);for(const scope of scopes){assert.equal((await c.query('SELECT pg_try_advisory_lock(6008,hashtext($1)) AS locked',[scope])).rows[0].locked,true);await c.query('SELECT pg_advisory_unlock(6008,hashtext($1))',[scope]);}
 checks.push({name:'three-scoped-and-one-unscoped-ancestor-fences-real-rollback',scopes,parentPid:outer.backendPid,leafPid:leaf.backendPid,pass:true});
 await record('extra-gate',{candidate:'c227f8c6ecfe85895937013e4687deb40247a6ee',checks});console.log('Extra independent gate controls PASS',checks.length);
}finally{await c.end();await cross?.close();await rebuilt.close();await other.close();await store.close();}
