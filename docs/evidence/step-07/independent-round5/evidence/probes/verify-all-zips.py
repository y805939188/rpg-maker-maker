from pathlib import Path
import json,hashlib,zipfile,io
from PIL import Image
O=Path('.local/step07-review');E=O/'evidence';sha=lambda b:hashlib.sha256(b).hexdigest();expected=sorted(['A1.png','A2.png','INSTALL.md','history.json','layout.json','manifest.json','pack.json','sources.json']);rows=[]
for p in sorted(E.rglob('*.zip')):
 with zipfile.ZipFile(p) as z:
  names=z.namelist();assert len(names)==8 and sorted(names)==expected and len(set(names))==8,(p,names);assert all('/' not in n and '\\' not in n and not n.startswith('.') for n in names);assert z.testzip() is None
  files={n:z.read(n) for n in names};m=json.loads(files['manifest.json']);i=m['identity'];assert i['schema']=='mz-pack-build-v1';assert i['profileHash']=='48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793';assert sha(json.dumps(i['profile'],sort_keys=True,separators=(',',':')).encode())==i['profileHash'];assert m['buildId']=='step05-pack-'+i['context']['commit'][:12]+'-'+sha(json.dumps(i,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode())[:16]
  assert sorted(i['files'])==sorted(n for n in expected if n!='manifest.json')
  checks=[]
  for n,v in i['files'].items():assert len(files[n])==v['bytes'] and sha(files[n])==v['sha256'];checks.append({'name':n,'bytes':len(files[n]),'sha256':sha(files[n])})
  png=[]
  for n in ['A1.png','A2.png']:
   im=Image.open(io.BytesIO(files[n])).convert('RGBA');assert im.size==(768,576);assert sha(im.tobytes())==i['atlases'][n]['pixelHash'];png.append({'name':n,'dimensions':[768,576],'rawRGBA256':sha(im.tobytes())})
  rows.append({'path':str(p.relative_to(O)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes()),'manifestSHA256':sha(files['manifest.json']),'buildIdentity':m['buildId'],'sourceContext':i['context']['commit'],'profileHash':i['profileHash'],'exactEightSafeMembers':True,'actualDecompressionCRC':True,'payloads':checks,'png':png})
(E/'all-standard-zip-verification.json').write_text(json.dumps({'result':'PASS','count':len(rows),'rows':rows},indent=2)+'\n');print('PASS actual ZIPs',len(rows),'CRC/exact8/safe/bytes/SHA/BuildIdentity/Profile/rawPNG')
