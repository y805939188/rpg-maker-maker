import {Persistence} from '@tileset/persistence';
import {MockProvider,Executor,Archiver} from '@tileset/local-executor';
import {assert,root,resolve,readFile,record,snapshot,PROFILE,pg} from './common.mjs';
const env=JSON.parse(await readFile(resolve(root,'private/independent-env.json'),'utf8')),state=JSON.parse(await readFile(resolve(root,'private/public-state.json'),'utf8')),s=new Persistence(env.url,env.assetRoot,PROFILE),c=new pg.Client({connectionString:env.url});await c.connect();const checks=[];
try {
 const task=await s.createTask(state.genericProject,snapshot()),provider=new MockProvider(resolve(root,'history-guard-remote'),await readFile('tests/fixtures/art-ground.png')),ex=new Executor(s,{adapterFor:()=>provider},new Archiver(s,provider));await ex.resume(task.id,'WAIT');let t=await s.task(task.id);await provider.complete(t.predictionId);await ex.resume(task.id,'QUERY_KNOWN_ID');assert.equal((await s.task(task.id)).state,'COMPLETED');
 const cols={ProjectSnapshot:'id',FileObject:'sha256',OriginalAsset:'id',AssetRevision:'id',RevisionDependency:'fromId',ProcessingRecord:'id',PackVersion:'id',SlotVersion:'packVersionId',Build:'id',BuildFile:'buildId',AcceptanceRecord:'id',TaskArtifact:'taskId'};
 for(const [table,col] of Object.entries(cols)){
  const first=await c.query(`SELECT "${col}" AS key FROM "${table}" LIMIT 1`);assert.equal(first.rowCount,1);
  for(const action of ['UPDATE','DELETE']){await c.query('BEGIN');let error;try{await c.query(action==='UPDATE'?`UPDATE "${table}" SET "${col}"="${col}" WHERE "${col}"=$1`:`DELETE FROM "${table}" WHERE "${col}"=$1`,[first.rows[0].key]);}catch(e){error=e.message;}finally{await c.query('ROLLBACK');}assert.match(error??'',/immutable history/);checks.push({table,action,rejected:true});}
 }
 const guardCases=[['frozen-input',"UPDATE \"LogicalTask\" SET snapshot='{}',version=version+1 WHERE id=$1"],['external-id',"UPDATE \"LogicalTask\" SET \"predictionId\"='forged',version=version+1 WHERE id=$1"],['durable-archive',"UPDATE \"LogicalTask\" SET \"archiveState\"='PENDING',version=version+1 WHERE id=$1"],['attempt-after-known',"UPDATE \"SubmissionAttempt\" SET state='INTENT' WHERE \"taskId\"=$1"]];
 for(const [name,sql] of guardCases){await c.query('BEGIN');let error;try{await c.query(sql,[task.id]);}catch(e){error=e.message;}finally{await c.query('ROLLBACK');}assert.ok(error);checks.push({name,error,rejected:true});}
 const d=await s.taskDetail(task.id);assert.equal(d.state,'COMPLETED');assert.equal(d.attempts.length,1);assert.equal(d.artifacts.length,1);assert.equal(d.attempts[0].predictionId,d.predictionId);
 await record('history-guards',{candidate:'c227f8c6ecfe85895937013e4687deb40247a6ee',checks,taskId:task.id,remoteId:d.predictionId,attemptId:d.attempts[0].id});console.log('Real PostgreSQL immutable/frozen/monotonic history guards PASS',checks.length);
}finally{await c.query('ROLLBACK').catch(()=>{});await c.end();await s.close();}
