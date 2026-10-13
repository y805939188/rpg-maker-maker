import os,sys,pathlib,subprocess,time,json,hashlib
root=pathlib.Path(__file__).resolve().parents[2];out=root/'.local/step07-review'
env=dict(os.environ);env['PATH']='/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:'+env['PATH']
for line in (root/'.env').read_text().splitlines():
 if '=' in line and not line.startswith('#'):
  k,v=line.split('=',1);env[k]=v.strip().strip('"').strip("'")
label=sys.argv[1];cwd=root
if '--formal' in sys.argv:
 cwd=out/'formal-workspace';sys.argv.remove('--formal')
if '--regression' in sys.argv:
 d=json.loads((out/'private/regression-env.json').read_text());env.update(d);sys.argv.remove('--regression')
env.update({'STEP07_TEST_API_PORT':'4387','INTEGRATION_API_PORT':'4387','API_PORT':'4387','WEB_PORT':'5287'})
if label.endswith('-dev'):env['E2E_MODE']='dev'
log=out/'private'/(label+'.log');start=time.time()
with log.open('wb') as f:r=subprocess.run(sys.argv[2:],cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT)
row={'label':label,'argv':sys.argv[2:],'cwd':str(cwd),'exitCode':r.returncode,'seconds':round(time.time()-start,3),'logRelative':'private/'+log.name,'logSHA256':hashlib.sha256(log.read_bytes()).hexdigest(),'logBytes':log.stat().st_size,'source':'59423201ba10ee71c3d1b04cebec69659017b7c7'}
with (out/'evidence/commands.jsonl').open('a') as f:f.write(json.dumps(row)+'\n')
print(json.dumps(row));sys.exit(r.returncode)
