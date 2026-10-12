import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Persistence } from '@tileset/persistence';
import { Executor, Archiver, MockProvider } from '@tileset/local-executor';
import { freezeTaskSnapshot } from '@tileset/ai-gateway';
import { PROFILE } from '../src/profile.js';
const url=process.env['DATABASE_URL'];if(!url)throw Error('Dedicated database configuration required');
const store=new Persistence(url,resolve('.local/assets'),PROFILE);
const provider=new MockProvider(resolve('.local/step06/mock-remote'),await readFile('tests/fixtures/art-ground.png'));
const executor=new Executor(store,{adapterFor:snapshot=>{if(snapshot.model.provider!=='mock'||snapshot.model.adapterVersion!==provider.adapterVersion)throw Error('Unsupported frozen Mock adapter');return provider;}},new Archiver(store,provider));
try {
  const action=process.argv[2],id=process.argv[3];
  if(action==='create'){
    if(!id||!/^[a-f0-9-]{36}$/.test(id))throw Error('Existing project UUID required');await store.projectSnapshot(id);
    // Synthetic configuration only. This is not a formal Prompt Registry or Composer.
    const task=await store.createTask(id,freezeTaskSnapshot({contractVersion:'task-snapshot-v1',configurationVersion:'step06-synthetic-config-v1',taskKind:'IMAGE_GENERATE',model:{provider:'mock',modelId:'synthetic-ground',modelVersion:'1',adapterVersion:provider.adapterVersion,parameters:{}},prompts:{main:{id:'synthetic-main',revision:'1',content:'Local synthetic recovery fixture.'},task:{id:'synthetic-task',revision:'1',content:'Return the archived synthetic PNG.'},supplemental:''},targetProfile:{id:PROFILE.id,version:PROFILE.version},style:{id:'synthetic',revision:'1',parameters:{}},structuredParameters:{},references:[]}));console.log(JSON.stringify({taskId:task.id,state:task.state}));
  }else if(action==='complete'){if(!id)throw Error('Mock external prediction ID required');await provider.complete(id);console.log(JSON.stringify({predictionId:id,mockRemote:'SUCCEEDED'}));}
  else if(action==='resume'){if(!id)throw Error('Persisted logical task UUID required');await executor.resume(id,'WAIT');const task=await store.task(id);console.log(JSON.stringify({taskId:task?.id,state:task?.state,predictionId:task?.predictionId}));}
  else if(action==='recover'){await executor.recoverAll();console.log(JSON.stringify({pending:(await store.pendingTasks()).map(task=>({taskId:task.id,state:task.state,predictionId:task.predictionId})),unknownPolicy:'RECONCILE_UNKNOWN_NO_RESUBMIT'}));}
  else throw Error('Use create, complete, resume or recover.');
}finally{await store.close();}
