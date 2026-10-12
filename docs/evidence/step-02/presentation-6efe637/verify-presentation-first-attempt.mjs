import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import prettier from 'prettier';
const before='da26087a635d6d3af4c6f762e8efcf53b8c38473';
const after='6efe637eabccf8c10496ddd1d0c2bead4637143a';
const frozen='5356d66e693613f9ce52c4b0ceaddfe2821fffb5';
const integration=execFileSync('git',['rev-parse','codex/step-02-integration'],{encoding:'utf8'}).trim();
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'});
const bytes=(ref,path)=>execFileSync('git',['show',ref+':'+path]);
const hash=b=>createHash('sha256').update(b).digest('hex');
const config=JSON.parse(await readFile('.prettierrc.json','utf8'));
function semantic(text){return text.split('\n').map(line=>{
 if(!line.startsWith('|'))return line;
 const cells=line.split('|').slice(1,-1).map(s=>s.trim());
 if(cells.every(c=>/^:?-+:?$/.test(c)))return '|'+cells.map(c=>c.startsWith(':')?(c.endsWith(':')?':---:':':---'):(c.endsWith(':')?'---:':'---')).join('|')+'|';
 return '|'+cells.join('|')+'|';
}).join('\n');}
const folders={1:'review-8a7d4b9-round-1',2:'review-396cefb-round-2',3:'review-c3914ec-round-3',4:'review-5356d66-round-4'};
const expectedRaw={1:'bb12df8bcd914264f13fcbe5bb38d9ee7325029afb82d2c3fbd5fbb255816ba9',2:'c197dc9893ee0c0901856361c0bfdfb4ab575c545263654f119564167a120695',3:'881a720ac82aaebb98722b3fcfae069cd25be029ed3e2ca9faecbcc5ba762381',4:'c3bffaf06311145d94463ca39144aba604b82c798b9e7128d1dc27ad523335a5'};
const stateOld=JSON.parse(git('show',before+':docs/orchestration/steps-02-03-state.json'));
const stateNew=JSON.parse(git('show',after+':docs/orchestration/steps-02-03-state.json'));
const reports=[];
for(const round of [1,2,3,4]){
 const path='docs/reviews/step-02-independent-round-'+round+'.md';
 const rawPath='docs/evidence/step-02/'+folders[round]+'/step02-round'+round+'-report.md';
 const old=bytes(before,path), current=bytes(after,path), archivedBefore=bytes(before,rawPath),archivedAfter=bytes(after,rawPath);
 const formatted=await prettier.format(old.toString(),{...config,filepath:path});
 const entry=stateNew.step02.reviews.find(r=>r.round===round);
 const r={round,path,rawPath,originalSha256:hash(old),presentationSha256:hash(current),archiveSha256:hash(archivedAfter),exactPinnedPrettierOutput:Buffer.from(formatted).equals(current),literalContentExceptTablePaddingUnchanged:semantic(old.toString())===semantic(current.toString()),oldCanonicalEqualsRawArchive:old.equals(archivedBefore),rawArchiveBytesUnchanged:archivedBefore.equals(archivedAfter),rawMatchesKnownReviewerHash:hash(archivedAfter)===expectedRaw[round],stateOriginalMatches:entry.originalReportSha256===expectedRaw[round],statePresentationMatches:entry.reportSha256===hash(current)};
 if(Object.entries(r).some(([k,v])=>typeof v==='boolean'&&!v))throw new Error('Presentation/archive verification failed in round'+round);
 reports.push(r);
}
const changed=git('diff','--name-only',before,after).trim().split('\n');
const allowed=new Set(['docs/orchestration/steps-02-03-state.json',...[1,2,3,4].map(n=>'docs/reviews/step-02-independent-round-'+n+'.md')]);
if(changed.length!==5||changed.some(p=>!allowed.has(p)))throw new Error('Unexpected patch file');
for(const round of [1,2,3,4]){
 for(const state of [stateOld,stateNew]){const entry=state.step02.reviews.find(r=>r.round===round); delete entry.reportSha256;delete entry.originalReportSha256;delete entry.reportPresentation;}
}
for(const state of [stateOld,stateNew]){delete state.step02.recovery.integrationPreparation.secondAttempt;delete state.step02.recovery.integrationPreparation.remedy;}
const stateOnlyAllowedBookkeeping=JSON.stringify(stateOld)===JSON.stringify(stateNew);
if(!stateOnlyAllowedBookkeeping)throw new Error('Unexpected orchestration state change');
const nonDocsDiff=git('diff','--name-only',frozen,integration,'--','.',':(exclude)docs/**').trim();
if(nonDocsDiff)throw new Error('Integration nonDocs differ');
const ledgerPath='docs/evidence/step-02/review-5356d66-round-4/evidence-ledger.json';const ledgerBytes=bytes(after,ledgerPath);const ledger=JSON.parse(ledgerBytes);
const archiveLedgerAllPathsValid=Object.entries(ledger.files).every(([path,h])=>hash(bytes(after,'docs/evidence/step-02/review-5356d66-round-4/'+path))===h);
if(!archiveLedgerAllPathsValid||hash(ledgerBytes)!=='f84bf1fd90ddef4ca83a49f000e30e61479bebedbb386a9cf17db86a94b75f85')throw new Error('Raw R4 ledger altered');
const report={scope:'DOCUMENT_PRESENTATION_INTEGRITY_SUPPLEMENT_ONLY',status:'PASS',before,after,formatToolVersion:prettier.version,sourceFrozen:frozen,integrationSnapshot:integration,integrationNonDocsDiff:'NONE',changedPaths:changed,reports,stateOnlyAllowedBookkeeping,archivedR4LedgerSha256:hash(ledgerBytes),archivedR4LedgerEntries:Object.keys(ledger.files).length,archiveLedgerAllPathsValid,newFunctionalTests:'NOT_EXECUTED_NOT_REQUIRED_FOR_PRESENTATION_ONLY',independentR4SourceConclusion:'UNCHANGED_PASS'};
await writeFile('.local/review/presentation-6efe637/verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
