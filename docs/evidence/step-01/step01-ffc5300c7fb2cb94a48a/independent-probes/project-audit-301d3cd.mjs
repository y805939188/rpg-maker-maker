import {strict as assert} from 'node:assert';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root='.local/mz/step01-ffc5300c7fb2cb94a48a';
const template='/Users/dingshinn/Library/Application Support/Steam/steamapps/common/RPG Maker MZ/RPGMZ.app/Contents/Resources/newdata';
const hash=b=>createHash('sha256').update(b).digest('hex');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const reference=await json(`${root}/step01-build-reference.json`),launcher=await json(`${root}/package.json`),system=await json(`${root}/data/System.json`),actors=await json(`${root}/data/Actors.json`),tilesets=await json(`${root}/data/Tilesets.json`),maps=await json(`${root}/data/MapInfos.json`);
assert.equal(reference.commit,'301d3cdb37743a53eff6046ccf2b23aea0ab8122');
assert.equal(reference.manifestSha256,hash(await readFile('artifacts/step01-ffc5300c7fb2cb94a48a/manifest.json')));
assert.equal(reference.launcherSha256,hash(await readFile(`${root}/package.json`)));
assert.equal(launcher.main,'index.html');assert.equal(launcher['chromium-args'],'--force-color-profile=srgb');assert.deepEqual([launcher.window.width,launcher.window.height],[816,624]);
const checkedPaths=[launcher.main,launcher.window.icon,'css/game.css'];
const main=await readFile(`${root}/js/main.js`,'utf8');
checkedPaths.push(...[...main.matchAll(/"(js\/[^"]+)"/g)].map(m=>m[1]));
for(const font of [system.advanced.mainFontFilename,system.advanced.numberFontFilename])checkedPaths.push(`fonts/${font}`);
for(const id of system.partyMembers){const actor=actors[id];if(actor.faceName)checkedPaths.push(`img/faces/${actor.faceName}.png`);if(actor.characterName)checkedPaths.push(`img/characters/${actor.characterName}.png`);}
for(const sound of system.sounds)if(sound.name)checkedPaths.push(`audio/se/${sound.name}.ogg`);
for(const mapInfo of maps.filter(Boolean))checkedPaths.push(`data/Map${String(mapInfo.id).padStart(3,'0')}.json`);
for(const path of checkedPaths)await readFile(resolve(root,path));
for(const[name,expected]of Object.entries(reference.coreFiles)){const actual=await readFile(`${root}/js/${name}`);assert.equal(hash(actual),expected);assert.equal(hash(actual),hash(await readFile(`${template}/js/${name}`)));}
assert.match(await readFile(`${root}/js/plugins.js`,'utf8'),/var \$plugins = \[\];/);
assert.equal(system.startMapId,2);assert.equal(system.advanced.tileSize,48);assert.equal(system.title1Name,'');assert.equal(system.title2Name,'');assert.equal(system.titleBgm.name,'');
for(const t of tilesets.filter(Boolean)){
 assert.equal(t.mode,1);assert.equal(t.flags[0],16);
 for(const base of [2816,2864])for(let s=0;s<48;s++)assert.equal(t.flags[base+s],0);
 for(const base of [2240,2336])for(let s=0;s<48;s++)assert.equal(t.flags[base+s],15);
 for(const name of t.tilesetNames.filter(Boolean))checkedPaths.push(`img/tilesets/${name}.png`);
}
for(const path of checkedPaths)await readFile(resolve(root,path));
for(const n of [2,3]){const map=await json(`${root}/data/Map${String(n).padStart(3,'0')}.json`);assert.ok(map.data.every(v=>v===0));assert.equal(map.autoplayBgm,false);assert.equal(map.autoplayBgs,false);assert.deepEqual(map.encounterList,[]);}
const result={commit:reference.commit,buildId:reference.buildId,result:'PASS',scope:'Static prepared-project launcher, declared startup dependencies, selected party/menu image/sound inputs, original core hashes and blank handdrawing maps; no actual NW.js/game boot executed',checkedPathCount:new Set(checkedPaths).size,launcherSha256:reference.launcherSha256,coreFiles:reference.coreFiles,editorDrawing:'NOT_EXECUTED',gameRuntime:'NOT_EXECUTED'};
await writeFile('.local/reviewer/project-audit-301d3cd.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
