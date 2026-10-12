import json,subprocess,sys,os,time,hashlib,pathlib,re
wt=pathlib.Path('/Users/dingshinn/.codex/worktrees/step-03-review/rpg-maker-maker')
out=wt/'.local/review/round1-7ca';name=sys.argv[1];expected=int(sys.argv[2]);mode=sys.argv[3];argv=sys.argv[4:]
env=os.environ.copy();safe={}
if mode in ['db','dev','prod']:
    private=pathlib.Path('/Users/dingshinn/.codex/worktrees/step-02-review/rpg-maker-maker/.local/review/database.env')
    for line in private.read_text().splitlines():
        if line and not line.startswith('#') and '=' in line:
            k,v=line.split('=',1);env[k]=v.strip().strip('"').strip("'")
    env.update({'API_PORT':'4315','WEB_PORT':'5177','INTEGRATION_API_PORT':'4315','API_HOST':'127.0.0.1','WEB_HOST':'127.0.0.1'})
    if mode=='dev':env['E2E_MODE']='dev'
    elif mode=='prod':env.pop('E2E_MODE',None)
    safe={'API_PORT':'4315','WEB_PORT':'5177','INTEGRATION_API_PORT':'4315','API_HOST':'127.0.0.1','WEB_HOST':'127.0.0.1','DATABASE_URL':'OWNED_REVIEW_LOOPBACK_CONFIG_LOADED_NO_VALUE_RECORDED'}
    if mode=='dev':safe['E2E_MODE']='dev'
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=wt,text=True).strip();assert head=='7ca928f2c1ac480691c77e67b3d19da4dda8e643'
started=time.time();log=out/(name+'.log')
with log.open('wb') as f:r=subprocess.run(argv,cwd=wt,env=env,stdout=f,stderr=subprocess.STDOUT)
d={'name':name,'sourceCommit':head,'argv':argv,'safeEnvironment':safe,'expectedExit':expected,'actualExit':r.returncode,'durationSeconds':time.time()-started,'log':log.name,'logSha256':hashlib.sha256(log.read_bytes()).hexdigest()}
with (out/'commands.jsonl').open('a') as f:f.write(json.dumps(d)+'\n')
print(json.dumps(d));print(log.read_text(errors='replace')[-5000:]);sys.exit(0 if r.returncode==expected else 1)
