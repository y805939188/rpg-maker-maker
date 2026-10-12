import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const old=['step03-7ca928f2c1ac-4f67c752343684ec','step03-material-7ca928f2c1ac-ea62343b13d105af','step01-507f3627a46d19ce6cbf'];
const builds=JSON.parse(await readFile('.local/step03-frozen-a0e9f07/builds.json','utf8'));const results=[];
for(const id of old){const bytes=await readFile(`artifacts/${id}/manifest.json`),manifest=JSON.parse(bytes);for(const [name,hash]of Object.entries(manifest.files))if(sha(await readFile(`artifacts/${id}/${name}`))!==hash)throw Error('Historical artifact changed.');results.push({buildId:id,manifestSha256:sha(bytes),allPayloadExact:true});}
const previous=JSON.parse(await readFile(`artifacts/${old[1]}/manifest.json`)),current=JSON.parse(await readFile(`artifacts/${builds[1].buildId}/manifest.json`));
for(const name of Object.keys(previous.files).filter(name=>name.endsWith('.png')||name==='revisions.json'))if(previous.files[name]!==current.files[name])throw Error('Pixel/revision master data changed.');
if(previous.files['tile-ir.json']===current.files['tile-ir.json'])throw Error('Parameter binding did not update the IR snapshot.');
const staging=(await readdir('artifacts')).filter(name=>name.startsWith('.stage-')||name.startsWith('.lock-'));if(staging.length)throw Error('Publication staging remains.');
console.log(JSON.stringify({oldBuilds:results,newSamplePngAndRevisionPayloadsUnchanged:true,tileIrHashUpdatedForExplicitParameters:true,stagingEntries:staging},null,2));
