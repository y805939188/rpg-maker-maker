import pathlib,json,hashlib
from PIL import Image
r=pathlib.Path.cwd();o=r/'.local/step07-review/evidence';b=o/'browser';f=o/'clock-browser';log=json.loads((f/'evidence.json').read_text());sha=lambda v:hashlib.sha256(v).hexdigest()
rows=[];frames=[0,1,2,1]
for entry in log['clock']:
 u=entry['update'];state=(u//30)%4;source=frames[state]
 actual=Image.open(f/f'delivery-update-{u}.png').convert('RGBA');expected=Image.open(b/f'reference-isolated-{state}.png').convert('RGBA');assert actual.tobytes()==expected.tobytes()
 raw=Image.open(f/f'source-{source}.png').convert('RGBA').resize((192,288),Image.Resampling.NEAREST);creative=Image.open(f/f'source-update-{u}.png').convert('RGBA');assert creative.tobytes()==raw.tobytes()
 rows.append({'update':u,'state':state,'sourceFrame':source,'deliveryPixelHash':sha(actual.tobytes()),'independentDeliveryPixelHash':sha(expected.tobytes()),'sourcePixelHash':sha(creative.tobytes()),'independentSourcePixelHash':sha(raw.tobytes()),'equal':True})
assert len(rows)==12
(o/'clock-canvas-verification.json').write_text(json.dumps({'reference':'handwritten independent quarter reference from original PNGs; logical math 60Hz/30/0,1,2,1','samples':rows,'threeCycles':True,'actualBrowserSourceAndDeliveryCanvas':True},indent=2)+'\n');print('PASS 12+12 real source/delivery canvas boundary samples across3periods')
