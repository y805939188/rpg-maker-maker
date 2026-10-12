import urllib.request,urllib.error,subprocess,json,os,time,hashlib
from pathlib import Path
out=Path('.local/final-evidence-round3-fix');commit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();started=time.time();origin='http://127.0.0.1:4310';report={'sourceCommit':commit,'apiOrigin':origin,'checks':[]};server=None;stopped=False
log=out/'compiled-backend.log'
def read(path='/api/health'):
 try:
  r=urllib.request.urlopen(origin+path,timeout=15);return r.status,json.loads(r.read())
 except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
def startup_case(name,extra):
 r=subprocess.run(['node','apps/api/dist/main.js'],env={**os.environ,'NODE_ENV':'production',**extra},capture_output=True,text=True,timeout=20)
 assert r.returncode==1,(name,r.returncode)
 assert 'Local startup failed.' in r.stderr and 'postgresql://' not in r.stderr and '/Users/' not in r.stderr and 'DATABASE_URL' not in r.stderr
 report['checks'].append({'name':name,'argv':['node','apps/api/dist/main.js'],'envOverrides':{'NODE_ENV':'production',**extra},'exitCode':r.returncode,'stderr':r.stderr})
try:
 with log.open('w') as f:
  server=subprocess.Popen(['node','apps/api/dist/main.js'],env={**os.environ,'NODE_ENV':'production'},stdout=f,stderr=subprocess.STDOUT)
  for i in range(100):
   try:
    status,body=read()
    if status==200:break
   except (urllib.error.URLError,ConnectionError):time.sleep(.05)
  else:raise RuntimeError('compiled server startup failed')
  report['checks'].append({'name':'compiled-node-health','status':status,'body':body,'pid':server.pid})
  report['listener']=subprocess.check_output(['lsof','-nP','-iTCP:4310','-sTCP:LISTEN'],text=True)
  startup_case('occupied-port',{})
  startup_case('invalid-bind',{'API_HOST':'0.0.0.0'})
  startup_case('equal-ports',{'WEB_PORT':'4310'})
  stop=subprocess.run(['pnpm','db:local','stop'],capture_output=True,text=True);assert stop.returncode==0;stopped=True
  startup_case('database-unavailable-startup',{})
  status,body=read();assert status==503 and body['error']['code']=='SERVICE_UNAVAILABLE'
  assert 'postgresql://' not in json.dumps(body) and '/Users/' not in json.dumps(body)
  report['checks'].append({'name':'database-offline-health','status':status,'body':body})
  start=subprocess.run(['pnpm','db:local','start'],capture_output=True,text=True);assert start.returncode==0;stopped=False
  status,body=read();assert status==200;report['checks'].append({'name':'database-restarted-health','status':status,'body':body})
  status,body=read('/api/projects');assert status==200 and isinstance(body['projects'],list);report['checks'].append({'name':'project-read-after-restart','status':status})
  (out/'database-lifecycle.log').write_text('COMMAND: pnpm db:local stop\n'+stop.stdout+stop.stderr+'\nCOMMAND: pnpm db:local start\n'+start.stdout+start.stderr)
finally:
 if stopped:subprocess.run(['pnpm','db:local','start'],check=True,capture_output=True)
 if server:
  server.terminate()
  try:server.wait(timeout=5)
  except subprocess.TimeoutExpired:server.kill();server.wait()
report['status']='PASS';(out/'runtime-faults.json').write_text(json.dumps(report,indent=2)+'\n')
rows=json.loads((out/'commands.json').read_text());p=out/'runtime-faults.json';rows.append({'name':'compiled-backend-faults','argv':['python3','.local/verify-frozen-backend.py'],'sourceCommit':commit,'exitCode':0,'expectedExitCode':0,'durationSeconds':round(time.time()-started,3),'log':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'envOverrides':{'NODE_ENV':'production'}});(out/'commands.json').write_text(json.dumps(rows,indent=2)+'\n');print('compiled backend faults PASS; own55432 restored, own API stopped')
