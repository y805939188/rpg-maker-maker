import hashlib,json,struct,zlib,subprocess
from pathlib import Path
sha=lambda b:hashlib.sha256(b).hexdigest()
source='7ca928f2c1ac480691c77e67b3d19da4dda8e643'
engineering=Path('artifacts/step03-7ca928f2c1ac-4f67c752343684ec')
material=Path('artifacts/step03-material-7ca928f2c1ac-ea62343b13d105af')
prototype=Path('artifacts/step01-507f3627a46d19ce6cbf')
approved=Path('/Users/dingshinn/Desktop/rpg-maker-maker/artifacts/step01-56368269c8328e0f84b9')
core=Path('/Users/dingshinn/Library/Application Support/Steam/steamapps/common/RPG Maker MZ/RPGMZ.app/Contents/Resources/newdata/js/rmmz_core.js')
def rgba(png):
 assert png[:8]==bytes([137,80,78,71,13,10,26,10]);offset=8;compressed=bytearray()
 while offset<len(png):
  size=struct.unpack('>I',png[offset:offset+4])[0];name=png[offset+4:offset+8];data=png[offset+8:offset+8+size]
  assert zlib.crc32(name+data)==struct.unpack('>I',png[offset+8+size:offset+12+size])[0]
  if name==b'IHDR':
   width,height,depth,color,compression,filtering,interlace=struct.unpack('>IIBBBBB',data);assert (depth,color,compression,filtering,interlace)==(8,6,0,0,0)
  if name==b'IDAT':compressed.extend(data)
  offset+=size+12
 raw=zlib.decompress(compressed);stride=width*4;assert len(raw)==height*(stride+1)
 result=bytearray();previous=bytearray(stride)
 for y in range(height):
  start=y*(stride+1);mode=raw[start];row=bytearray(raw[start+1:start+1+stride]);assert mode<=4
  for x in range(stride):
   left=row[x-4] if x>=4 else 0;up=previous[x];ul=previous[x-4] if x>=4 else 0
   if mode==1: predictor=left
   elif mode==2:predictor=up
   elif mode==3:predictor=(left+up)//2
   elif mode==4:
    p=left+up-ul;a,b,c=abs(p-left),abs(p-up),abs(p-ul);predictor=left if a<=b and a<=c else up if b<=c else ul
   else:predictor=0
   row[x]=(row[x]+predictor)&255
  result.extend(row);previous=row
 return width,height,bytes(result)
reports=[]
for directory in [engineering,material,prototype]:
 manifest=json.loads((directory/'manifest.json').read_text());assert manifest['commit']==source
 hashes=manifest['files'];actual={str(p.relative_to(directory)) for p in directory.rglob('*') if p.is_file()}
 assert actual==set(hashes)|{'manifest.json'}
 for name,expected in hashes.items():
  assert sha((directory/name).read_bytes())==expected
  if directory==engineering:assert sha(Path(name).read_bytes())==expected, name
 reports.append({'buildId':manifest['buildId'],'manifestSha256':sha((directory/'manifest.json').read_bytes()),'payloadFiles':len(hashes),'allPublishedFilesMatch':True,'allCurrentCompiledFilesMatch':directory==engineering})
four=[]
for name in ['diagnostic_A1.png','diagnostic_A2.png','art_A1.png','art_A2.png']:
 a=(approved/name).read_bytes();b=(prototype/name).read_bytes();assert a==b
 aw,ah,ar=rgba(a);bw,bh,br=rgba(b);assert (aw,ah,ar)==(bw,bh,br)
 four.append({'file':name,'byteSha256':sha(b),'rgbaSha256':sha(br),'exactApprovedBytes':True,'exactIndependentRgba':True})
art=json.loads(Path('packages/material-processing/tests/fixtures/fixed-shoreline.json').read_text());sample=[]
for name,expected in [('ground',art['grass']),('static-mask',art['mask'])]+[(f'water-{i}',pixels) for i,pixels in enumerate(art['expected'])]:
 width,height,data=rgba((material/'processed'/f'{name}.png').read_bytes());assert (width,height)==(art['width'],art['height']);assert data==bytes(v for pixel in expected for v in pixel)
 sample.append({'file':f'processed/{name}.png','exactLiteralExpectedPixels':True,'rgbaSha256':sha(data)})
coreHash=sha(core.read_bytes());assert coreHash=='4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f'
report={'source':source,'builds':reports,'approvedManifestSha256':sha((approved/'manifest.json').read_bytes()),'fourPngRegression':four,'processedSample':sample,'coreSha256':coreHash,'licensedRuntimeCopied':False,'implementation':'Independent stdlib PNG CRC/inflate/filter and literal expected selection; no production decoder/compiler imported.'}
print(json.dumps(report,indent=2))
