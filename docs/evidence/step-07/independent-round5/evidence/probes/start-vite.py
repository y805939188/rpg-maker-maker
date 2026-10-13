from pathlib import Path
import subprocess,os,time,json,urllib.request,uuid
r=Path.cwd();o=r/'.local/step07-review';nonce=uuid.uuid4().hex;env=os.environ.copy();env['PATH']='/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:'+env['PATH'];env['WEB_PORT']='5287';log=o/'private/own-vite.log'
h=log.open('wb');p=subprocess.Popen(['pnpm','--filter','@tileset/web','dev'],cwd=r,env=env,stdout=h,stderr=subprocess.STDOUT,start_new_session=True)
(o/'private/own-vite-control.json').write_text(json.dumps({'pid':p.pid,'pgid':p.pid,'nonce':nonce,'cwd':str(r),'argv':['pnpm','--filter','@tileset/web','dev'],'logRelative':'private/own-vite.log'})+'\n')
for i in range(150):
 if p.poll() is not None:raise RuntimeError('own Vite exited')
 try:
  with urllib.request.urlopen('http://127.0.0.1:5287',timeout=.5) as response:
   if response.status==200:break
 except Exception:time.sleep(.1)
else:raise RuntimeError('own Vite startup budget')
print(json.dumps({'ownPID':p.pid,'ownPGID':p.pid,'webPort':5287}))
