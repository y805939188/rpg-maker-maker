import pathlib,struct,zlib,hashlib,json,subprocess

root=pathlib.Path(__file__).resolve().parents[3]
out=pathlib.Path(__file__).resolve().parent
current=root/'artifacts/step01-0c4bab5226bff144467a'
approved=pathlib.Path('/Users/dingshinn/Desktop/rpg-maker-maker/artifacts/step01-56368269c8328e0f84b9')
sha=lambda b:hashlib.sha256(b).hexdigest()

def trusted_rgba8_png(b):
    # Independent stdlib inflate/filter reconstruction for four already hash-bound owned PNGs only.
    # This helper is not a production importer and accepts no user-controlled path or generic media.
    assert b[:8]==bytes([137,80,78,71,13,10,26,10])
    offset=8; idat=bytearray(); chunks=[]
    while offset<len(b):
        size=struct.unpack('>I',b[offset:offset+4])[0]
        kind=b[offset+4:offset+8]; data=b[offset+8:offset+8+size]
        assert zlib.crc32(kind+data)&0xffffffff==struct.unpack('>I',b[offset+8+size:offset+12+size])[0]
        chunks.append(kind.decode())
        if kind==b'IHDR':
            w,h,depth,color,compression,filtering,interlace=struct.unpack('>IIBBBBB',data)
            assert (depth,color,compression,filtering,interlace)==(8,6,0,0,0)
            assert (w,h)==(768,576)
        if kind==b'IDAT': idat.extend(data)
        offset+=size+12
    rowbytes=w*4; compressed=zlib.decompress(idat)
    assert len(compressed)==h*(rowbytes+1)
    previous=bytearray(rowbytes); rgba=bytearray(); filters={}
    for y in range(h):
        start=y*(rowbytes+1); mode=compressed[start]; filters[str(mode)]=filters.get(str(mode),0)+1
        row=bytearray(compressed[start+1:start+1+rowbytes]); assert mode in range(5)
        for x in range(rowbytes):
            left=row[x-4] if x>=4 else 0; up=previous[x]; ul=previous[x-4] if x>=4 else 0
            if mode==0: value=0
            elif mode==1: value=left
            elif mode==2: value=up
            elif mode==3: value=(left+up)//2
            else:
                p=left+up-ul; a=abs(p-left); c=abs(p-up); d=abs(p-ul)
                value=left if a<=c and a<=d else up if c<=d else ul
            row[x]=(row[x]+value)&255
        rgba.extend(row); previous=row
    return bytes(rgba),{'width':w,'height':h,'chunks':chunks,'filters':filters,'rgbaSha256':sha(rgba)}

manifest=json.loads((current/'manifest.json').read_text()); old=json.loads((approved/'manifest.json').read_text())
rows=[]
for name,expected in manifest['files'].items():
    new=(current/name).read_bytes(); prior=(approved/name).read_bytes()
    assert sha(new)==expected==old['files'][name]
    new_pixels,info=trusted_rgba8_png(new); old_pixels,old_info=trusted_rgba8_png(prior)
    assert new==prior and new_pixels==old_pixels
    program="import {decodePng} from '@tileset/prototype'; import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';const p=await decodePng(await readFile(process.argv[1]));console.log(JSON.stringify({width:p.width,height:p.height,rgbaSha256:createHash('sha256').update(p.data).digest('hex')}));"
    decoded=json.loads(subprocess.check_output(['node','--input-type=module','-e',program,str(current/name)],cwd=root,text=True))
    assert decoded['rgbaSha256']==info['rgbaSha256'] and (decoded['width'],decoded['height'])==(768,576)
    rows.append({'file':name,'byteSha256':expected,'byteExactApprovedMatch':True,'independentRGBAExactApprovedMatch':True,'publicPatchedDecoderMatchesIndependentRGBA':True,'independentDecode':info,'approvedIndependentDecode':old_info})
report={'sourceCommit':manifest['commit'],'currentBuild':manifest['buildId'],'approvedBuild':old['buildId'],'decoder':'Python stdlib zlib + independent RGBA8 PNG filter reconstruction; no Sharp expected pixels','profileExactMatch':manifest['profile']==old['profile'],'pixelContractExactMatch':manifest['pixelContract']==old['pixelContract'],'runtimeEncoder':manifest['encoder'],'files':rows}
assert report['profileExactMatch'] and report['pixelContractExactMatch']
(out/'approved-png-byte-pixel-regression.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'sourceCommit':manifest['commit'],'files':len(rows),'allByteAndPixelMatches':True,'publicPatchedDecoderMatchesIndependentRGBA':True}))
