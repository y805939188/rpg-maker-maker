from pathlib import Path
import subprocess,os,json,signal,time
r=Path.cwd();o=r/'.local/step07-review';d=json.loads((o/'private/own-vite-control.json').read_text());s=subprocess.check_output(['ps','-p',str(d['pid']),'-o','command='],text=True).strip();assert 'pnpm' in s and '@tileset/web' in s and 'dev' in s
# Verify group leader has stayed the explicitly spawned child group.
assert int(subprocess.check_output(['ps','-p',str(d['pid']),'-o','pgid='],text=True))==d['pgid']
os.killpg(d['pgid'],signal.SIGTERM)
for i in range(150):
 q=subprocess.run(['ps','-p',str(d['pid']),'-o','stat='],capture_output=True,text=True).stdout.strip()
 if not q or q.startswith('Z'):break
 time.sleep(.1)
else:raise RuntimeError('own Vite did not terminate')
d['stopped']=True;(o/'evidence/own-vite-stop.json').write_text(json.dumps(d,indent=2)+'\n');print('own Vite group stopped')
