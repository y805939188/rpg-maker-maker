import pathlib,json,hashlib,struct,zlib,sys,zipfile
expected=sorted(['A1.png','A2.png','INSTALL.md','history.json','layout.json','manifest.json','pack.json','sources.json'])
def u16(b,at):return struct.unpack_from('<H',b,at)[0]
def u32(b,at):return struct.unpack_from('<I',b,at)[0]
def verify(p):
 b=p.read_bytes();end=len(b)-22
 assert end>=0 and u32(b,end)==0x06054b50,'Missing exact EOCD'
 assert u16(b,end+4)==u16(b,end+6)==0,'Multi-disk'
 assert u16(b,end+8)==u16(b,end+10)==8,'Not eight central members'
 assert u16(b,end+20)==0,'Unexpected ZIP comment'
 directory=u32(b,end+16);assert directory+u32(b,end+12)==end,'Directory size/offset'
 at=directory;members={};localEnds=[]
 for _ in range(8):
  assert u32(b,at)==0x02014b50,'Bad central signature'
  assert u16(b,at+8)==u16(b,at+10)==0,'Flags/compression'
  length=u32(b,at+20);assert u32(b,at+24)==length,'Central lengths'
  n,e,c=u16(b,at+28),u16(b,at+30),u16(b,at+32);name=b[at+46:at+46+n].decode('utf8')
  assert name in expected and name not in members,'Unsafe/duplicate/unknown central member'
  offset=u32(b,at+42);assert offset<directory and u32(b,offset)==0x04034b50,'Bad local offset'
  assert u16(b,offset+6)==u16(b,offset+8)==0,'Local flags/compression'
  assert u32(b,offset+14)==u32(b,at+16),'Local/central CRC disagree'
  assert u32(b,offset+18)==u32(b,offset+22)==length,'Local lengths'
  ln,le=u16(b,offset+26),u16(b,offset+28)
  assert b[offset+30:offset+30+ln]==name.encode(),'Local/central name mismatch'
  start=offset+30+ln+le;data=b[start:start+length]
  assert start+length<=directory and len(data)==length,'Body bounds'
  assert zlib.crc32(data)==u32(b,at+16),'CRC mismatch'
  members[name]=data;localEnds.append((offset,start+length));at+=46+n+e+c
 assert at==end and sorted(members)==expected,'Central extent/members'
 localEnds.sort();assert localEnds[0][0]==0 and localEnds[-1][1]==directory,'Local extent'
 assert all(a[1]==c[0] for a,c in zip(localEnds,localEnds[1:])),'Local gaps/overlap'
 with zipfile.ZipFile(p) as z:
  assert sorted(z.namelist())==expected and z.testzip() is None
  for n in expected:assert z.read(n)==members[n]
 manifest=json.loads(members['manifest.json']);identity=manifest['identity']
 assert sorted(identity['files'])==sorted(x for x in expected if x!='manifest.json'),'Manifest payload members'
 for n,meta in identity['files'].items():
  assert len(members[n])==meta['bytes'] and hashlib.sha256(members[n]).hexdigest()==meta['sha256'],'Manifest file hash'
 profile=hashlib.sha256(json.dumps(identity['profile'],sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
 assert profile=='48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793','Wrong Profile'
 return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'exportBuildId':manifest['buildId'],'manifestSHA256':hashlib.sha256(members['manifest.json']).hexdigest(),'profileHash':profile,'source':identity['context']['commit'],'members':{n:{'bytes':len(d),'sha256':hashlib.sha256(d).hexdigest()} for n,d in members.items()}}
if __name__=='__main__':
 rows=[]
 for value in sys.argv[1:]:
  p=pathlib.Path(value)
  try:rows.append({'status':'PASS','actual':verify(p)})
  except Exception as e:rows.append({'file':str(p),'status':'REJECTED','error':str(e),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 out=pathlib.Path('.local/step07-review/evidence/strict-zip-negative-oracle.json')
 out.write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps([{'file':r.get('file',r.get('actual',{}).get('file')),'status':r['status'],'error':r.get('error')} for r in rows],indent=2))
