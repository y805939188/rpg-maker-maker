import os,sys,pathlib,subprocess,time,json,hashlib,shlex
root=pathlib.Path(__file__).resolve().parents[3]
out=pathlib.Path(__file__).resolve().parent
name=sys.argv[1]; argv=sys.argv[2:]; env=os.environ.copy()
env['PATH']='/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:'+env['PATH']
for line in (root/'.local/review/database.env').read_text().splitlines():
 if line and not line.startswith('#'):
  key,value=line.removeprefix('export ').split('=',1); env[key]=shlex.split(value)[0]
env.update(API_HOST='127.0.0.1',API_PORT='4311',WEB_PORT='5174')
if name.startswith('e2e-dev'): env['E2E_MODE']='dev'
else: env.pop('E2E_MODE',None)
start=time.time()
p=subprocess.run(argv,cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
b=p.stdout
for k in ['DATABASE_URL','PGPASSWORD']:
 if env.get(k): b=b.replace(env[k].encode(),b'[REDACTED_PRIVATE_ENV]')
log=out/(name+'.log'); log.write_bytes(b)
record={'name':name,'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'argv':argv,'env':{k:env[k] for k in ['API_HOST','API_PORT','WEB_PORT','E2E_MODE'] if k in env},'privateDatabaseEnv':'existing 0600 local env loaded; values excluded','exitCode':p.returncode,'durationSeconds':round(time.time()-start,3),'log':log.name,'logSha256':hashlib.sha256(b).hexdigest()}
with (out/'commands.jsonl').open('a') as f: f.write(json.dumps(record)+'\n')
print(json.dumps(record))
print(b.decode(errors='replace')[-5000:])
sys.exit(p.returncode)
