import {readFile,writeFile,readdir,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const root=resolve('.local/step06-review'),env=JSON.parse(await readFile(resolve(root,'private/env.json'),'utf8')),pg=createRequire(resolve('packages/persistence/package.json'))('pg');
const c=new pg.Client({connectionString:env.DATABASE_URL});await c.connect();
try {
 const dbs=(await c.query("SELECT datname FROM pg_database WHERE datname LIKE 'tileset_%' ORDER BY datname")).rows.map(x=>x.datname),act=(await c.query("SELECT pid,datname,application_name,state FROM pg_stat_activity WHERE datname LIKE 'tileset_%' AND pid<>pg_backend_pid() ORDER BY pid")).rows;
 const pgData=(await c.query('SHOW data_directory')).rows[0].data_directory;const version=(await c.query('SELECT version()')).rows[0].version;
 const before=JSON.parse(await readFile(resolve(root,'evidence/source-before.json'),'utf8')),after={};const differences=[];
 for(const [p,sha] of Object.entries(before)){let current;try{current=createHash('sha256').update(await readFile(p)).digest('hex');}catch(e){current=null;}after[p]=current;if(current!==sha)differences.push({path:p,before:sha,after:current});}
 const status=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}),head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const listenerText=spawnSync('lsof',['-nP','-iTCP:4371','-iTCP:5271','-sTCP:LISTEN'],{encoding:'utf8'}).stdout.trim();
 const record={head,status,protectedFiles:Object.keys(before).length,differences,allUnchanged:!differences.length,sourceSha:'c227f8c6ecfe85895937013e4687deb40247a6ee',toolchain:{node:process.versions.node,pnpm:execFileSync('pnpm',['--version'],{encoding:'utf8'}).trim()},environment:{pgPort:55471,dataDirectory:pgData,version,databases:dbs,otherConnections:act,apiWebListeners:listenerText,owner:'step06-review-round3'},after};
 await writeFile(resolve(root,'evidence/source-after.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({head,protectedFiles:record.protectedFiles,allUnchanged:record.allUnchanged,status,databases:dbs.length,connections:act.length,apiWebListeners:listenerText}));if(differences.length||status||head!==record.sourceSha)process.exitCode=1;
}finally{await c.end();}
