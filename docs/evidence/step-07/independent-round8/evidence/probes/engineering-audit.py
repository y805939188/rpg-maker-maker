import pathlib,json,hashlib,subprocess
root=pathlib.Path.cwd();r=root/'.local/step07-review';build='step07-c8d41a680df4-773d3198403cc2e3';a=root/'artifacts/step07-r8-aux';newbase=a/'artifacts'/build;mbytes=(newbase/'manifest.json').read_bytes();m=json.loads(mbytes);sha=lambda b:hashlib.sha256(b).hexdigest();assert sha(mbytes)=='3a1933af2b34dacb939f83d1b74dd18a992fa13d61691341301016ccdf4a6feb'
expected=json.loads(subprocess.check_output(['git','show','401fc5471bef0b60bc9b5689ea8b29109f8420ab:docs/evidence/step-07/r7-zip-fix/ledger.json']));auth=pathlib.Path('/Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker')/expected['build']['manifestPath'];assert sha(auth.read_bytes())==sha(mbytes)
rows=[]
for p,h in m['files'].items():
 b=(newbase/p).read_bytes();assert sha(b)==h
 for base in [root,a,auth.parent]:assert (base/p).read_bytes()==b
 rows.append({'path':p,'sha256':sha(b),'bytes':len(b),'immutableManagedAuxAuthorAllEqual':True})
oldRows=[]
for n in [5,6,7]:
 oldroot=pathlib.Path(f'/Users/dingshinn/.codex/worktrees/step-07-review-round{n}/rpg-maker-maker');main=pathlib.Path(f'/Users/dingshinn/Desktop/rpg-maker-maker/docs/evidence/step-07/independent-round{n}/evidence');old=(main/'engineering-manifest.json').read_bytes();om=json.loads(old);deltas=[]
 for p,h in om['files'].items():
  ob=(oldroot/p).read_bytes();assert sha(ob)==h
  nb=(newbase/p).read_bytes()
  if ob!=nb:deltas.append(p)
 assert deltas==['apps/api/dist/resources/studio.json'];oldStudio=json.loads((oldroot/deltas[0]).read_bytes());newStudio=json.loads((newbase/deltas[0]).read_bytes());oc=oldStudio['context']['commit'];nc=newStudio['context']['commit'];oldStudio['context'].pop('commit');newStudio['context'].pop('commit');assert oldStudio==newStudio
 oldRows.append({'round':n,'originalSource':om['commit'],'oldManifestSha256':sha(old),'originalLiveActualPayloadsChecked':len(om['files']),'sameCompiled':205,'changed':deltas,'onlyContextCommitChange':True,'oldCommit':oc,'newCommit':nc})
identity={k:v for k,v in m.items() if k not in ['buildId','validation','note']};independent='step07-'+m['commit'][:12]+'-'+sha(json.dumps(identity,separators=(',',':'),ensure_ascii=False).encode())[:16];assert independent==build
profile=sha(json.dumps(m['profile'],sort_keys=True,separators=(',',':'),ensure_ascii=False).encode());assert profile=='48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793'
(r/'evidence/engineering-manifest.json').write_bytes(mbytes);(r/'evidence/engineering-verification.json').write_text(json.dumps({'source':m['commit'],'buildId':build,'manifestSHA256':sha(mbytes),'manifestBytes':len(mbytes),'independentBuildId':independent,'payloads':len(rows),'profileHash':profile,'actualFiles':rows,'previousIndependentActualBuildComparisons':oldRows,'generation':'Reviewer managed fresh pnpm check compilation; own ignored full-history detached clean auxiliary checkout; original builder unchanged; generated payload copied from reviewer fresh build and compared actual bytes'},indent=2)+'\n');print({'latestPayloads':len(rows),'manifest':sha(mbytes),'old':oldRows})
