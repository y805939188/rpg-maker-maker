import subprocess,json,pathlib,os,shutil,hashlib,datetime
base=pathlib.Path(__file__).resolve().parent;candidate=base/'candidate';old=base/'old-301d3cd'
env=os.environ.copy();env['PATH']='/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:'+env['PATH']
source=candidate/'tests/copy-rect.test.ts';target=old/'tests/review-copy-rect.test.ts';shutil.copyfile(source,target)
results=[]
cmd=['pnpm','exec','vitest','run','tests/review-copy-rect.test.ts'];r=subprocess.run(cmd,cwd=old,env=env,capture_output=True,text=True)
(base/'old-new-regression.log').write_text(r.stdout+r.stderr);results.append({'label':'old-new-overlap-regressions','command':cmd,'exitCode':r.returncode,'copiedTestHash':hashlib.sha256(source.read_bytes()).hexdigest()});print('old-regression',r.returncode,flush=True)
cwd=base/'complete-prepare';cwd.mkdir();template='/Users/dingshinn/Library/Application Support/Steam/steamapps/common/RPG Maker MZ/RPGMZ.app/Contents/Resources/newdata';build=candidate/'artifacts/step01-fdf7768b475e24c66cfd';project=cwd/'.local/mz/step01-fdf7768b475e24c66cfd'
cmd=['node',str(candidate/'dist/scripts/prepare-mz.js'),template,str(build)]
for label in ['complete-prepare','repeat-prepare']:
 r=subprocess.run(cmd,cwd=cwd,env=env,capture_output=True,text=True)
 (base/(label+'.log')).write_text(r.stdout+r.stderr);item={'label':label,'command':cmd,'cwd':str(cwd),'exitCode':r.returncode};print(label,r.returncode,flush=True)
 ledger={str(p.relative_to(project)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(project.rglob('*')) if p.is_file()}
 (base/(label+'-hashes.json')).write_text(json.dumps(ledger,indent=2)+'\n')
 item['projectFiles']=len(ledger);results.append(item)
(base/'regression-and-complete.json').write_text(json.dumps(results,indent=2)+'\n')
