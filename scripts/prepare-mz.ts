import { cp,mkdir,readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PROFILE } from '../src/profile.js';
import { readJson,sha256 } from './io.js';
import { loadNativeOracle } from './mz-oracle.js';
import { preflightPrototypeBuild,REQUIRED_ATLASES } from './prototype-input.js';

const [templateArg,buildArg] = process.argv.slice(2);
if (!templateArg||!buildArg) throw new Error('Usage: pnpm prepare:mz <licensed MZ newdata directory> <immutable build directory>');
const template = resolve(templateArg),build = resolve(buildArg);
const input = await preflightPrototypeBuild(build);
const m = input.manifest;
await loadNativeOracle(resolve(template,'js/rmmz_core.js'));
const project = resolve('.local/mz',m.buildId);
await mkdir(resolve('.local/mz'),{recursive:true});
await mkdir(project); // refuses to overwrite any earlier project or handdrawn map
for (const dir of ['data','js','css','fonts','icon','effects']) await cp(resolve(template,dir),resolve(project,dir),{recursive:true,errorOnExist:true});
await cp(resolve(template,'index.html'),resolve(project,'index.html'),{errorOnExist:true});
for (const dir of ['img/system','img/characters','img/faces','audio/se']) await cp(resolve(template,dir),resolve(project,dir),{recursive:true,errorOnExist:true});
await mkdir(resolve(project,'img/tilesets'),{recursive:true});
// Write the exact preflighted bytes, not a second read of potentially changed input paths.
for (const name of REQUIRED_ATLASES) await writeFile(resolve(project,'img/tilesets',name),input.atlases[name],{flag:'wx'});
await writeFile(resolve(project,'game.rmmzproject'),`RPGMZ ${PROFILE.engineVersion}`);
// The official newdata skeleton omits files that the editor adds during project creation.
// NW.js requires this launcher manifest for the editor's native playtest command.
await writeFile(resolve(project,'package.json'),JSON.stringify({
  name:'rmmz-game',main:'index.html','chromium-args':'--force-color-profile=srgb',
  window:{title:`AI Tileset Step01 ${m.buildId}`,width:816,height:624,position:'center',icon:'icon/icon.png'},
},null,2)+'\n');
await writeFile(resolve(project,'js/plugins.js'),'// Native compatibility test: no plugins\nvar $plugins = [];\n');
const flags = Array<number>(8192).fill(0);
flags[0]=PROFILE.flags.emptyUpperTile;
// Unused slots are blocked; occupied ground slots are passable, occupied water slots impassable.
for (let i=2048;i<8192;i++) flags[i]=15;
for (const slot of PROFILE.groundSlots) for (let s=0;s<48;s++) flags[slot.tileId+s]=PROFILE.flags.ground;
for (const slot of PROFILE.waterSlots) for (let s=0;s<48;s++) flags[slot.tileId+s]=PROFILE.flags.water;
await writeFile(resolve(project,'data/Tilesets.json'),JSON.stringify([null,...['diagnostic','art'].map((family,i)=>({
  id:i+1,name:`Step01 ${family}`,mode:PROFILE.mode,flags,note:'Fixed candidate profile; no Counter/Bush/star on ground/water',
  tilesetNames:[`${family}_A1`,`${family}_A2`,'','','','','','',''],
}))]));
const system = await readJson<Record<string,unknown>>(resolve(project,'data/System.json'));
system['gameTitle']=`AI Tileset Step01 ${m.buildId}`;
system['startMapId']=2;system['startX']=1;system['startY']=1;
system['partyMembers']=[1];system['title1Name']='';system['title2Name']='';
system['titleBgm']={name:'',volume:90,pitch:100,pan:0};
system['hasEncryptedImages']=false;system['hasEncryptedAudio']=false;
const advanced=system['advanced'] as Record<string,unknown>;
advanced['tileSize']=48;
await writeFile(resolve(project,'data/System.json'),JSON.stringify(system));
const templateMap=await readJson<Record<string,unknown>>(resolve(template,'data/Map001.json'));
function map(width:number,height:number,tilesetId:number):Record<string,unknown> {
  return {...templateMap,width,height,tilesetId,data:Array<number>(width*height*6).fill(0),events:[null],
    autoplayBgm:false,autoplayBgs:false,parallaxName:'',encounterList:[],note:'Step01 test; never regenerated after editor handdrawing'};
}
const prescribed=map(16,12,1);
const data=prescribed['data'] as number[];
for (let s=0;s<48;s++) {
  const x=s%8,y=Math.floor(s/8);
  for (let slot=0;slot<2;slot++) {
    data[y*16+x+slot*8]=PROFILE.waterSlots[slot]!.tileId+s;
    data[(y+6)*16+x+slot*8]=PROFILE.groundSlots[slot]!.tileId+s;
  }
}
const artMap=map(17,13,2),diagMap=map(17,13,1);
for (const [id,value] of [[1,prescribed],[2,artMap],[3,diagMap]] as const) {
  await writeFile(resolve(project,`data/Map${id.toString().padStart(3,'0')}.json`),JSON.stringify(value));
}
await writeFile(resolve(project,'data/MapInfos.json'),JSON.stringify([null,
  {id:1,name:'01 Prescribed shapes (scripted)',parentId:0,order:1,expanded:false,scrollX:0,scrollY:0},
  {id:2,name:'02 Art handdrawing (blank)',parentId:0,order:2,expanded:false,scrollX:0,scrollY:0},
  {id:3,name:'03 Diagnostic handdrawing (blank)',parentId:0,order:3,expanded:false,scrollX:0,scrollY:0},
]));
const coreFiles:Record<string,string>={};
for (const name of ['rmmz_core.js','rmmz_managers.js','rmmz_objects.js','rmmz_scenes.js','rmmz_sprites.js','rmmz_windows.js']) {
  coreFiles[name]=sha256(await readFile(resolve(project,'js',name)));
}
await writeFile(resolve(project,'step01-build-reference.json'),JSON.stringify({
  buildId:m.buildId,commit:m.commit,profile:PROFILE.version,
  manifestSha256:input.manifestSha256,atlasHashes:m.files,
  coreFiles,editorDrawing:'NOT_EXECUTED',gameRuntime:'NOT_EXECUTED',
  playtestHost:'NOT_VERIFIED',nativeMzAcceptance:'NOT_EXECUTED',
  launcherSha256:sha256(await readFile(resolve(project,'package.json'))),
  note:'Locally assembled from licensed MZ installation. Do not redistribute runtime or RTP. Store observations separately; retain handdrawn Map002/003.',
},null,2)+'\n');
console.log(JSON.stringify({project,projectFile:resolve(project,'game.rmmzproject'),buildId:m.buildId,coreFiles},null,2));
