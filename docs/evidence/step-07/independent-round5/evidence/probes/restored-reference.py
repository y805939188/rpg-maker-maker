from pathlib import Path
import json,zipfile,hashlib
from PIL import Image
r=Path.cwd();o=r/'.local/step07-review/evidence/restored-pixels';sha=lambda b:hashlib.sha256(b).hexdigest();ref={};exec((r/'.local/step07-review/reference.py').read_text().split('for scene,rows in scenes.items():')[0],ref)
checks=[]
for n,f in enumerate([0,1,2,1]):
 expected=ref['render'](ref['scenes']['isolated'],f,[ref['water'][1],ref['water'][1],ref['water'][2]]);actual=Image.open(o/f'actual-isolated-{n}.png').convert('RGBA');assert actual.tobytes()==expected.tobytes();checks.append({'state':n,'sourceFrame':f,'actualRGBA':sha(actual.tobytes()),'independentRGBA':sha(expected.tobytes())})
j=json.loads((o/'evidence.json').read_text());assert Image.open(o/'processed.png').convert('RGBA').tobytes()==bytes(j['processed']['pixels']);assert sha((o/'processed.png').read_bytes())==j['processed']['sha']
with zipfile.ZipFile(o/'current.zip') as z:
 assert len(z.namelist())==8 and z.testzip() is None;assert sorted(z.namelist())==sorted(['A1.png','A2.png','manifest.json','pack.json','history.json','layout.json','sources.json','INSTALL.md']);files={n:z.read(n) for n in z.namelist()};m=json.loads(files['manifest.json']);assert m['buildId']=='step05-pack-'+m['identity']['context']['commit'][:12]+'-'+sha(json.dumps(m['identity'],sort_keys=True,ensure_ascii=False,separators=(',',':')).encode())[:16]
 for n,x in m['identity']['files'].items():assert len(files[n])==x['bytes'] and sha(files[n])==x['sha256']
 for n in ['A1.png','A2.png','manifest.json']:assert files[n]==(o/n).read_bytes()
 assert m['identity']['profile']==json.loads((o/'profile.json').read_text());assert sha(json.dumps(m['identity']['profile'],sort_keys=True,separators=(',',':')).encode())==m['identity']['profileHash']
(o/'verification.json').write_text(json.dumps({'result':'PASS','build':j['build'],'canvasStates':checks,'processedRGBAEqual':True,'zip':{'sha256':j['zipSHA'],'manifestSHA':sha(files['manifest.json']),'buildIdentity':m['buildId'],'eightFilesCRCAndSHA':True,'networkPNGManifestProfileSameExport':True}},indent=2)+'\n');print('PASS actual restored processedPNG/RGBA + four independent canvas states + same-network real standard ZIP')
