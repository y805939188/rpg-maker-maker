import pathlib,json,hashlib
root=pathlib.Path.cwd();r=root/'.local/step07-review';a=root/'artifacts/step07-r8-aux';out=a/'.local/step07-r8-private';out.mkdir(exist_ok=True)
src=(root/'apps/api/tests/studio/integration.test.ts').read_text();diagnostic=src
for rel in ['./stored-zip.js','../../../../packages/image-adapter/src/isolation.js','../../src/app.js','../../src/config.js','../../src/studio-service.js']:
 absolute=(a/'apps/api/tests/studio'/rel).resolve();diagnostic=diagnostic.replace("'"+rel+"'","'"+str(absolute)+"'")
# Wrap fetch only after real HTTP has completed. Body/headers differ only for
# the selected consumer download; PG, API, browser network PNG stay genuine.
instrument='''
const r8NativeFetch = globalThis.fetch;
const r8Variant = process.env['R8_VARIANT'] ?? 'none';
const r8CaptureRoot = process.env['R8_CAPTURE']!;
let r8DownloadIndex = 0;
const r8ProcessedCalls: { ms:number; status:number; url:string }[]=[];
globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
  const t=performance.now();
  const response = await r8NativeFetch(...args);
  const actualUrl=typeof args[0]==='string'?args[0]:args[0] instanceof URL?args[0].href:args[0].url;
  if (/\\/processed\\?frame=/.test(actualUrl)) {
    r8ProcessedCalls.push({ms:performance.now()-t,status:response.status,url:actualUrl});
    await writeFile(resolve(r8CaptureRoot,'processed-calls.json'),JSON.stringify(r8ProcessedCalls,null,2)+'\\n');
  }
  if (response.status!==200 || !actualUrl.endsWith('/download')) return response;
  const index=r8DownloadIndex++, original=Buffer.from(await response.clone().arrayBuffer());
  await writeFile(resolve(r8CaptureRoot,`download-${index}-original.zip`),original);
  if(r8Variant!==`fault-${index}`)return response;
  const mutated=Buffer.from(original), end=mutated.length-22, central=mutated.readUInt32LE(end+16);
  mutated[central+16]!^=1;
  const headers=new Headers(response.headers);headers.set('x-content-sha256',hashBytes(mutated));
  await writeFile(resolve(r8CaptureRoot,`download-${index}-central-crc.zip`),mutated);
  await writeFile(resolve(r8CaptureRoot,'mutation.json'),JSON.stringify({index,url:actualUrl,status:response.status,originalSHA:hashBytes(original),badSHA:hashBytes(mutated),centralCRCBitChanged:true,offset:central+16,outerBodySHARecomputed:headers.get('x-content-sha256'),exportManifestHeader:headers.get('x-export-manifest-sha256')},null,2)+'\\n');
  return new Response(mutated,{status:response.status,statusText:response.statusText,headers});
};
'''
needle='loadEnvironment();';assert diagnostic.count(needle)==1;diagnostic=diagnostic.replace(needle,needle+'\n'+instrument)
# Uniform 1500ms delay on every real processed response, including the new
# development service. Class wrapper prevents missing the mode switch.
delay='''
if (r8Variant==='delay') {
  const r8Processed=StudioService.prototype.processed;
  StudioService.prototype.processed=async function (...args:Parameters<StudioService['processed']>) {
    const value=await r8Processed.apply(this,args);
    await new Promise<void>(resolve=>setTimeout(resolve,1500));
    return value;
  };
}
'''
diagnostic=diagnostic.replace(instrument,instrument+delay)
p=out/'r8-integration.test.ts';p.write_text(diagnostic)
config="import {defineConfig} from 'vitest/config';\nexport default defineConfig({test:{include:['.local/step07-r8-private/r8-integration.test.ts'],fileParallelism:false,maxWorkers:1,testTimeout:180000,hookTimeout:60000}});\n";(out/'vitest.r8.mts').write_text(config)
# Freeze diagnostic source as own ignored evidence; never alter formal tests.
(r/'evidence/probes/r8-diagnostic-source.ts.txt').write_text(diagnostic);(r/'evidence/probes/r8-diagnostic-config.mts.txt').write_text(config)
(r/'evidence/diagnostic-scope.json').write_text(json.dumps({'source':'c8d41a680df42fe565882d93d3f85a04f7a10b22','auxPhysicalRoot':str(a),'auxHEADDetachedCleanBeforeInstrumentation':True,'formalSourceTestUnchanged':True,'originalCaseCopiedEntirely':True,'onlyInstrumentation':'absolute source module path remap; actual fetch clone capture; one central CRC bit + correct outer SHA at selected download; uniform real processed1500ms delay for latency variant','testBudget':180000,'hookBudget':60000,'allOriginalExpectSitesPreserved':True,'negativeRunsExpectedExit':1,'negativeExit0':'UNEXPECTED_FALSE_PASS_NOT_CANDIDATE_PASS','diagnosticSourceSha256':hashlib.sha256(diagnostic.encode()).hexdigest()},indent=2)+'\n');print('diagnostic prepared, production/formaltests/config unchanged')
