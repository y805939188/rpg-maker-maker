import {readFile} from 'node:fs/promises';
import {Persistence} from '@tileset/persistence';
import {Executor,Archiver,MockProvider} from '@tileset/local-executor';
import {PROFILE} from '../../dist/src/profile.js';
const input=JSON.parse(await readFile(process.argv[2],'utf8'));let store;const hook=async point=>{if(point===input.stopAt){const lease=store.gate.current();process.send?.({point,pid:process.pid,leasePid:lease?.backendPid,scope:lease?.scope});await new Promise(r=>{process.once('message',r);});}};
store=new Persistence(process.env.DATABASE_URL,input.root,PROFILE,hook);
try{let result;if(input.mode==='publish'){const prepared={...input.prepared,files:Object.fromEntries(Object.entries(input.prepared.files).map(([k,b])=>[k,new Uint8Array(Buffer.from(b,'base64'))]))};result=await store.publish(prepared);}else if(input.mode==='task'){const provider=new MockProvider(input.remoteRoot,await readFile('tests/fixtures/art-ground.png'),hook),ex=new Executor(store,{adapterFor:()=>provider},new Archiver(store,provider,hook),hook);await ex.resume(input.taskId,input.directive??'WAIT');result=await store.task(input.taskId);}else if(input.mode==='write')result=await store.createProject(input.name);else throw Error('unknown mode');process.send?.({point:'finished',result});}catch(e){process.send?.({point:'error',error:e.message});process.exitCode=1;}finally{await store.close();}
