import subprocess,json,datetime,pathlib,os
base=pathlib.Path(__file__).resolve().parent
candidate=base/'candidate'
template='/Users/dingshinn/Library/Application Support/Steam/steamapps/common/RPG Maker MZ/RPGMZ.app/Contents/Resources/newdata'
build='artifacts/step01-fdf7768b475e24c66cfd'
commands=[('identity',['git','rev-parse','HEAD']),('status-before',['git','status','--short']),('node',['node','--version']),('pnpm',['pnpm','--version']),('install',['pnpm','install','--frozen-lockfile']),('typecheck',['pnpm','typecheck']),('test',['pnpm','test']),('build',['pnpm','build']),('prototype',['pnpm','prototype']),('verify-mz',['pnpm','verify:mz',template+'/js/rmmz_core.js',build]),('status-after',['git','status','--short'])]
results=[]
for label,cmd in commands:
 started=datetime.datetime.now(datetime.timezone.utc).isoformat()
 r=subprocess.run(cmd,cwd=candidate,text=True,capture_output=True)
 (base/(label+'.log')).write_text(r.stdout+r.stderr)
 item={'label':label,'command':cmd,'cwd':str(candidate),'startedAt':started,'exitCode':r.returncode,'log':label+'.log'}
 results.append(item);print(label,r.returncode,flush=True)
 (base/'automatic-checks.json').write_text(json.dumps(results,indent=2)+'\n')
 if r.returncode:print(r.stdout+r.stderr,flush=True);break
