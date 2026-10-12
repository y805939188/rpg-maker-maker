from pathlib import Path
import json,hashlib,zlib,struct,subprocess
wt=Path('/Users/dingshinn/.codex/worktrees/step-03-review/rpg-maker-maker');root=Path('/Users/dingshinn/Desktop/rpg-maker-maker');author=Path('/Users/dingshinn/.codex/worktrees/step-03-coding/rpg-maker-maker');out=wt/'.local/review/round2-a0e';sha=lambda b:hashlib.sha256(b).hexdigest()
expected={'step03-a0e9f07ae265-4ecf0ddf8cce1edf':('46c0de9ce066e16c1bd00d0b511f771f101f4fc689228e1dc2d852a3f2b6f0aa',88),'step03-material-a0e9f07ae265-cd0467ddf07df105':('384b360002a5ee24cb4d7b4230367455a36b7b250f480d06b01c8046849e9f99',13),'step01-4b1e0cd7d9e2af9f004f':('3bffcde791f57694f3113a3e3a4a594938846a79001245d7116d4c4eb1f89bd0',4)}
def rgba(path):
 b=path.read_bytes();assert b[:8]==bytes([137,80,78,71,13,10,26,10]);at=8;idat=[]
 while at<len(b):
  n=struct.unpack_from('>I',b,at)[0];typ=b[at+4:at+8];d=b[at+8:at+8+n];assert zlib.crc32(typ+d)==struct.unpack_from('>I',b,at+8+n)[0]
  if typ==b'IHDR':w,h,depth,color,comp,filt,inter=struct.unpack('>IIBBBBB',d);assert (depth,color,comp,filt,inter)==(8,6,0,0,0)
  if typ==b'IDAT':idat.append(d)
  at+=n+12
 raw=zlib.decompress(b''.join(idat));stride=w*4;assert len(raw)==h*(stride+1);prior=bytearray(stride);pixels=bytearray()
 def paeth(a,b,c):
  p=a+b-c;x,y,z=abs(p-a),abs(p-b),abs(p-c);return a if x<=y and x<=z else b if y<=z else c
 for y in range(h):
  at=y*(stride+1);ft=raw[at];row=bytearray(raw[at+1:at+stride+1]);assert ft in range(5)
  for x in range(stride):
   a=row[x-4] if x>=4 else 0;bb=prior[x];c=prior[x-4] if x>=4 else 0
   row[x]=(row[x]+[0,a,bb,(a+bb)//2,paeth(a,bb,c)][ft])&255
  pixels.extend(row);prior=row
 return w,h,bytes(pixels)
reports=[];all_hashes={};approved=root/'artifacts/step01-56368269c8328e0f84b9';approvedm=json.loads((approved/'manifest.json').read_text());assert sha((approved/'manifest.json').read_bytes())=='1be77467ae7d5fab2c574dce1918d3c4a9a4b54b64a7beda0a42e89c8461351b'
for name,(mh,count) in expected.items():
 base=wt/'artifacts'/name;m=json.loads((base/'manifest.json').read_text());assert sha((base/'manifest.json').read_bytes())==mh;assert m['buildId']==name and m['commit']=='a0e9f07ae26567c3a623a2b38e42b0b015441d30';assert m['lockSha256']==sha((wt/'pnpm-lock.yaml').read_bytes());assert m['pixelContract']=='rgba8-srgb-integer-v1' and m['profile']==approvedm['profile'];assert len(m['files'])==count
 fs={str(p.relative_to(base)):sha(p.read_bytes()) for p in base.rglob('*') if p.is_file()};assert all(not p.is_symlink() for p in base.rglob('*'));assert set(fs)==set(m['files'])|{'manifest.json'}
 for p,hsh in m['files'].items():assert fs[p]==hsh
 comparisons={};
 for other,label in [(root,'root'),(author,'author')]:
  ob=other/'artifacts'/name;comparisons[label]=all((ob/p).is_file() and sha((ob/p).read_bytes())==h for p,h in fs.items());assert comparisons[label]
 if name.startswith('step03-material'):
  assert m['domainContract']=='asset-revision-v1' and m['irContract']=='tile-ir-v1' and m['processing']=='fixed-shoreline-v1' and m['targetCompilation']=='NOT_EXECUTED';assert m['codec']['sharp']=='0.35.5' and m['codec']['vips']=='8.18.7'
  art=json.loads((wt/'packages/material-processing/tests/fixtures/fixed-shoreline.json').read_text());assert m['fixtureSha256']==sha((wt/'packages/material-processing/tests/fixtures/fixed-shoreline.json').read_bytes());matches=[]
  e={'sources/grass.png':art['grass'],'sources/mask.png':art['mask'],'sources/bank-detail.png':art['overlay'],'processed/ground.png':art['grass'],'processed/static-mask.png':art['mask']}
  for i in range(3):e[f'sources/water-{i}.png']=art['water'][i];e[f'processed/water-{i}.png']=art['expected'][i]
  for p,vals in e.items():w,h,pix=rgba(base/p);assert (w,h)==(art['width'],art['height']) and pix==bytes(v for pixel in vals for v in pixel);matches.append({'file':p,'rgbaSha256':sha(pix),'literalExpectedExact':True})
  ir=json.loads((base/'tile-ir.json').read_text());assert m['artifactHash']==ir['contentHash'];
  for d in [ir['groundImage'],ir['staticMaskImage'],*ir['frames']]:assert sha(rgba(base/d['file'])[2])==d['pixelHash']
  out.joinpath('material-independent-pixels.json').write_text(json.dumps(matches,indent=2)+'\n')
 if name.startswith('step01'):
  pngs=[]
  for p,hsh in m['files'].items():
   assert sha((approved/p).read_bytes())==hsh and (base/p).read_bytes()==(approved/p).read_bytes();w,h,pix=rgba(base/p);assert rgba(approved/p)==(w,h,pix);pngs.append({'file':p,'pngSha256':hsh,'rgbaSha256':sha(pix),'rgbaBytes':len(pix),'approvedByteAndPixelExact':True})
  for p,hsh in m['sources'].items():assert sha((wt/'tests/fixtures'/p).read_bytes())==hsh
  assert m['encoder']['sharp']=='0.35.5' and m['encoder']['vips']=='8.18.7';out.joinpath('legacy-independent-pixels.json').write_text(json.dumps(pngs,indent=2)+'\n')
 if name.startswith('step03-a'):
  assert m['domainContract']=='asset-revision-v1' and m['irContract']=='tile-ir-v1' and m['taskContract']=='task-snapshot-v1' and m['httpContract']=='http-v1'
  for p,hsh in m['files'].items():assert sha((wt/p).read_bytes())==hsh
 all_hashes[name]=fs;reports.append({'buildId':name,'manifestSha256':mh,'payloadFiles':count,'allHashesMatch':True,'sourceContractLockProfileBindings':True,'allCopiedFilesExact':comparisons})
assert not [p.name for p in (wt/'artifacts').iterdir() if p.name.startswith(('.stage-','.lock-'))]
result={'status':'PASS','builds':reports,'artifactHashes':all_hashes};out.joinpath('artifact-integrity-current.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'status':'PASS','builds':reports},indent=2))
