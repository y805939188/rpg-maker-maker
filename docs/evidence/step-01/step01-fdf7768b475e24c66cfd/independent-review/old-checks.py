import subprocess,json,pathlib,os
base=pathlib.Path(__file__).resolve().parent
cwd=base/'old-301d3cd';env=os.environ.copy();env['PATH']='/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:'+env['PATH']
results=[]
for label,cmd in [('old-node',['node','--version']),('old-install',['pnpm','install','--frozen-lockfile']),('old-build',['pnpm','build']),('old-prototype',['pnpm','prototype'])]:
 r=subprocess.run(cmd,cwd=cwd,env=env,text=True,capture_output=True)
 (base/(label+'.log')).write_text(r.stdout+r.stderr);results.append({'label':label,'command':cmd,'exitCode':r.returncode});print(label,r.returncode,flush=True)
 (base/'old-checks.json').write_text(json.dumps(results,indent=2)+'\n')
 if r.returncode:print(r.stdout+r.stderr,flush=True);break
