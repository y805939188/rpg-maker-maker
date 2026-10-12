import { readFile } from 'node:fs/promises';
import { Persistence } from '@tileset/persistence';
import { Executor, Archiver, MockProvider } from '@tileset/local-executor';
import { PROFILE } from '../src/profile.js';
// Isolated process harness is also a production-JS restart entry: no TS loader or in-memory store.
const input:unknown=JSON.parse(await readFile(process.argv[2]!,'utf8'));
if(!input||typeof input!=='object'||!('root'in input)||typeof input.root!=='string'||!('mode'in input)||typeof input.mode!=='string')throw Error('Process input invalid');
const url=process.env['DATABASE_URL'];if(!url)throw Error('Dedicated database required');
const hook=async(point:string)=>{process.send?.({point});if('stopAt'in input&&input.stopAt===point)await new Promise<void>(()=>{});};
const store=new Persistence(url,input.root,PROFILE,hook);
try{
  if(input.mode==='publish'){
    if(!('prepared'in input)||!input.prepared||typeof input.prepared!=='object')throw Error('Missing prepared build');
    // Reconstruct only byte buffers. All metadata/owned objects are revalidated by publish.
    const p=input.prepared;if(!('files'in p)||!p.files||typeof p.files!=='object')throw Error('Missing files');
    const files:Record<string,Uint8Array>={};for(const [name,value]of Object.entries(p.files)){if(typeof value!=='string')throw Error('Invalid encoded file');files[name]=new Uint8Array(Buffer.from(value,'base64'));}
    if(!('id'in p)||typeof p.id!=='string'||!('projectId'in p)||typeof p.projectId!=='string'||!('packId'in p)||typeof p.packId!=='string'||!('projectSnapshotId'in p)||typeof p.projectSnapshotId!=='string'||!('expectedPackVersion'in p)||typeof p.expectedPackVersion!=='number')throw Error('Invalid build metadata');
    await store.publish({id:p.id,projectId:p.projectId,packId:p.packId,projectSnapshotId:p.projectSnapshotId,expectedPackVersion:p.expectedPackVersion,files});
  }else if(input.mode==='task'){
    if(!('taskId'in input)||typeof input.taskId!=='string'||!('remoteRoot'in input)||typeof input.remoteRoot!=='string'||!('png'in input)||typeof input.png!=='string')throw Error('Invalid task process');
    const provider=new MockProvider(input.remoteRoot,Buffer.from(input.png,'base64'),hook),executor=new Executor(store,{adapterFor:()=>provider},new Archiver(store,provider,hook),hook);await executor.resume(input.taskId,'WAIT');
  }else throw Error('Unsupported process mode');
  process.send?.({point:'finished'});
}finally{await store.close();}
