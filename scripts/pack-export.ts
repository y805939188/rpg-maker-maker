import { strict as assert } from 'node:assert';
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RawSource, RgbaImage, buildProcessedAsset, fingerprint, freezeJson, hashBytes, requireDenseArray, sameRef } from '@tileset/asset-core';
import type { RevisionRef, ValidatedSource } from '@tileset/asset-core';
import { codecRuntime, decodeSource, encodePng } from '@tileset/image-adapter';
import { processShoreline } from '@tileset/material-processing';
import { COMPILER_VERSION, FRAGMENT_CONTRACT, compileFragment } from '@tileset/mz-compiler';
import { ASSEMBLY_VERSION, PACK_CONTRACT, LAYOUT_CONTRACT, PROFILE_HASH, planPack, renderAtlas, validateLayout } from '@tileset/pack-assembly';
import type { LayoutPlan, PackSnapshot } from '@tileset/pack-assembly';
import type { makeCompilerFixture } from './step04-fixture.js';
import { PROFILE } from '../src/profile.js';

type Fixture = Awaited<ReturnType<typeof makeCompilerFixture>>;
export interface RecipeArchive {
  readonly style: Fixture['style']; readonly parameters: Fixture['parameters']; readonly recipe: Fixture['recipe'];
  readonly sources: readonly { readonly descriptor: Omit<ConstructorParameters<typeof RawSource>[0],'bytes'|'encoding'>; readonly ref: RevisionRef; readonly validationHash: string; readonly png: string }[];
}
export function archiveFixture(f: Pick<Fixture,'style'|'parameters'|'recipe'|'sources'>): RecipeArchive {
  return freezeJson({style:f.style,parameters:f.parameters,recipe:f.recipe,sources:f.sources.map(s => ({
    descriptor:{id:s.ref.id,revision:s.ref.revision,role:s.raw.role,density:s.raw.density,provenance:s.raw.provenance},ref:s.ref,validationHash:s.validationHash,png:Buffer.from(s.raw.bytes()).toString('base64')
  }))});
}
function keys(value: unknown, fields: string[]): void {
  assert.ok(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype);
  assert.deepEqual(Object.keys(value).sort(), fields.sort());
}
export async function replayArchives(input: unknown) {
  // Snapshot JSON before asynchronous codec work; caller cannot race a source/ref change.
  const archives = freezeJson(input) as readonly RecipeArchive[];
  requireDenseArray(archives,'Recipe archives'); assert.ok(archives.length > 0 && archives.length <= 128);
  const fragments = [], recipes = new Set<string>();
  let total = 0;
  for (const a of archives) {
    keys(a,['style','parameters','recipe','sources']); requireDenseArray(a.sources,'Archived sources'); assert.equal(a.sources.length,6);
    assert.ok(!recipes.has(a.recipe.ref.contentHash)); recipes.add(a.recipe.ref.contentHash);
    const sources: ValidatedSource[] = [];
    for (const s of a.sources) {
      keys(s,['descriptor','ref','validationHash','png']); keys(s.descriptor,['id','revision','role','density','provenance']);
      assert.ok(typeof s.png === 'string' && s.png.length <= 5592408 && /^[A-Za-z0-9+/]*={0,2}$/.test(s.png));
      const bytes = Buffer.from(s.png,'base64'); assert.equal(bytes.toString('base64'),s.png);
      total += bytes.length; assert.ok(total <= 32*1024*1024,'Archived PNG input exceeds local export budget.');
      const result = await decodeSource(new RawSource({...s.descriptor,encoding:'png',bytes}));
      if (result.status !== 'validated') throw Error(result.diagnostic.code);
      assert.ok(sameRef(result.source.ref,s.ref)); assert.equal(result.source.validationHash,s.validationHash); sources.push(result.source);
    }
    const built = buildProcessedAsset(processShoreline({...a,sources}),'pack-replay');
    fragments.push(compileFragment(built.ir,'a2-ground'),compileFragment(built.ir,'a1-water'));
  }
  return {archives,fragments};
}
export const jsonBytes = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value,null,2)+'\n');
export interface ExportInput {
  readonly snapshot: PackSnapshot; readonly history: readonly PackSnapshot[]; readonly plan: LayoutPlan; readonly archives: readonly RecipeArchive[];
}
export interface BuildContext { readonly commit: string; readonly lockSha256: string; readonly node: string; readonly codec: Readonly<Record<string,string>> }
export async function currentBuildContext(commit: string, lockSha256: string): Promise<BuildContext> {
  return freezeJson({commit,lockSha256,node:process.versions.node,codec:await codecRuntime()});
}
function installation(input: ExportInput): string {
  return `# AI Tileset Studio Pack ${input.snapshot.packId} version ${input.snapshot.version}\n\nCopy A1.png and A2.png to img/tilesets with stable names. Register both images in the MZ database; Area Type (mode=1), 48px tiles. No project data is automatically modified.\n\nGround: passage circle (flags=0); water: blocked in all directions (flags low bits=15); no Star/Counter/Bush on occupied slots. Empty B top-left remains Star (flags[0]=16). Unsupported/unused slots are blocked. Baked grass pixels on a water tile remain water collision.\n\n| Logical material | Revision | State | Atlas / kind | Shape-0 Tile ID | Origin |\n|---|---:|---|---|---:|---|\n${input.plan.placements.map(p=>`| ${p.binding.logicalId} | ${p.binding.revision} | ${p.state} | ${p.atlas} / ${p.kind} | ${p.tileId} | ${p.x},${p.y} |`).join('\n')}\n\nWater only pairs with its recorded groundId and exact recipe/IR/source versions in pack.json. Three source frames play 0→1→2→1, advancing every 30 Tilemap updates. Retired content remains installed and must not be replaced by a different logical material. Intentional revision updates can change appearance; slot identity stays stable.\n\nFor existing maps, replace images using the existing filenames and retain database entry/flags/Tile IDs. Never regenerate maps to claim compatibility. Validate first install and old-map replacement separately using docs/step-05/mz-acceptance.md. Native editor/game/visual acceptance and independent Review remain NOT_EXECUTED for this Build; save new evidence referencing manifest/atlas hashes, never edit manifest.json.\n`;
}
function manifest(input: ExportInput, context: BuildContext, files: Record<string,Uint8Array>, atlases: ReturnType<typeof renderAtlas>) {
  keys(context,['commit','lockSha256','node','codec']); assert.match(context.commit,/^[a-f0-9]{40}$/); assert.match(context.lockSha256,/^[a-f0-9]{64}$/);
  assert.ok(typeof context.node === 'string');
  assert.equal(context.codec.sharp,'0.35.5');
  assert.ok(typeof context.codec.vips === 'string' && Object.values(context.codec).every(v=>typeof v==='string'));
  const body = {schema:'mz-pack-build-v1',packContract:PACK_CONTRACT,layoutContract:LAYOUT_CONTRACT,fragmentContract:FRAGMENT_CONTRACT,
    compiler:COMPILER_VERSION,assembly:ASSEMBLY_VERSION,pixelContract:PROFILE.pixelContract,profile:PROFILE,profileHash:PROFILE_HASH,
    context,pack:{id:input.snapshot.packId,version:input.snapshot.version,contentHash:input.snapshot.contentHash,previousHash:input.snapshot.previousHash},
    layoutHash:input.plan.contentHash,bindings:input.plan.placements,
    files:Object.fromEntries(Object.keys(files).sort().map(name => [name,{sha256:hashBytes(files[name]!),bytes:files[name]!.length}])),
    atlases:{'A1.png':{width:atlases.a1.width,height:atlases.a1.height,pixelHash:atlases.a1.pixelHash},'A2.png':{width:atlases.a2.width,height:atlases.a2.height,pixelHash:atlases.a2.pixelHash}},
    recommendedMZ:{engineVersion:PROFILE.engineVersion,mode:PROFILE.mode,tileSize:PROFILE.tileSize,flags:PROFILE.flags},
    validation:{sourceReplay:'PASS',fragment:'PASS',history:'PASS',layout:'PASS',atlas:'PASS',pngRoundtrip:'PASS',manifestConsistency:'PASS',
      independentReview:'NOT_EXECUTED_BY_DESIGN',editorDrawing:'NOT_EXECUTED',gameRuntime:'NOT_EXECUTED',visual:'NOT_EXECUTED',userApproval:'NOT_EXECUTED'}
  };
  return freezeJson({buildId:`step05-pack-${context.commit.slice(0,12)}-${fingerprint(body).slice(0,16)}`,identity:body});
}
export async function decodeAtlas(bytes: Uint8Array): Promise<RgbaImage> {
  const result = await decodeSource(new RawSource({id:'pack-atlas',revision:1,role:'grass',density:1,encoding:'png',bytes,
    provenance:{origin:'deterministic',author:'Pack verification',license:'CC0-1.0',toolVersion:ASSEMBLY_VERSION,parents:[]}}));
  if(result.status !== 'validated') throw Error(result.diagnostic.code); return result.source.image;
}
function payloads(input: ExportInput): Record<string,Uint8Array> {
  const files: Record<string,Uint8Array> = {'pack.json':jsonBytes(input.snapshot),'history.json':jsonBytes(input.history),'layout.json':jsonBytes(input.plan),'INSTALL.md':jsonBytes(installation(input))};
  // Markdown is text, not a quoted JSON string.
  files['INSTALL.md'] = new TextEncoder().encode(installation(input));
  files['sources.json'] = jsonBytes(input.archives);
  return files;
}
export async function assembleExport(inputValue: ExportInput, contextValue: BuildContext) {
  const input = freezeJson(inputValue), context = freezeJson(contextValue), replay = await replayArchives(input.archives);
  const plan = validateLayout(PROFILE,input.plan,input.snapshot,input.history,replay.fragments);
  assert.ok(plan.placements.some(p=>p.atlas==='A1') && plan.placements.some(p=>p.atlas==='A2'),'A standard paired Pack must contain ground and water.');
  const atlases = renderAtlas(PROFILE,plan,input.snapshot,input.history,replay.fragments), files = payloads(input);
  for (const [name,image] of [['A1.png',atlases.a1],['A2.png',atlases.a2]] as const) {
    files[name] = await encodePng(image);
    assert.equal((await decodeAtlas(files[name]!)).pixelHash,image.pixelHash);
  }
  const m = manifest(input,context,files,atlases);
  files['manifest.json'] = jsonBytes(m);
  return {manifest:m,files,input,fragments:replay.fragments,atlases};
}
export async function readPackExport(directory: string) {
  const names = ['A1.png','A2.png','pack.json','history.json','layout.json','sources.json','INSTALL.md','manifest.json'];
  assert.deepEqual((await readdir(directory)).sort(),names.sort(),'Export inventory must be exact; no unfinished/unrecorded payload.');
  const files: Record<string,Uint8Array> = {};
  for (const name of names) {
    const path = resolve(directory,name), stat = await lstat(path); assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 48*1024*1024);
    files[name] = new Uint8Array(await readFile(path));
  }
  const parse = (name:string) => JSON.parse(new TextDecoder().decode(files[name]!));
  const m = parse('manifest.json') as ReturnType<typeof manifest>;
  keys(m,['buildId','identity']);
  const input: ExportInput = freezeJson({snapshot:parse('pack.json'),history:parse('history.json'),plan:parse('layout.json'),archives:parse('sources.json')});
  const replay = await replayArchives(input.archives), atlases = renderAtlas(PROFILE,input.plan,input.snapshot,input.history,replay.fragments);
  assert.ok(input.plan.placements.some(p=>p.atlas==='A1') && input.plan.placements.some(p=>p.atlas==='A2'));
  const expected = payloads(input);
  for(const name of ['pack.json','history.json','layout.json','sources.json','INSTALL.md']) assert.deepEqual(files[name],expected[name]);
  for(const [name,image] of [['A1.png',atlases.a1],['A2.png',atlases.a2]] as const) {
    const actual = await decodeAtlas(files[name]!); assert.equal(actual.width,image.width); assert.equal(actual.height,image.height);
    assert.deepEqual(actual.bytes(),image.bytes()); expected[name]=files[name]!;
  }
  assert.deepEqual(m,manifest(input,m.identity.context,expected,atlases),'Manifest, Plan, source replay and actual PNG must agree.');
  return {manifest:m,manifestSha256:hashBytes(files['manifest.json']!),files,input,fragments:replay.fragments,atlases};
}
/** Single local publisher; does not implement DB/CAS/distributed publication. */
export async function publishDirectory(destination: string, files: Record<string,Uint8Array>, verify: (directory:string)=>Promise<unknown>) {
  const target = resolve(destination), parent = resolve(target,'..'), stage = `${target}.stage-${process.pid}`, lock = `${target}.lock`;
  await mkdir(parent,{recursive:true}); await mkdir(lock);
  // Acquire only after exclusive mkdir; rename ends ownership of the stage path.
  let stageOwned = false;
  try {
    try { await lstat(target); throw Error('Immutable destination already exists.'); } catch(e) { if((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    await mkdir(stage);
    stageOwned = true;
    for(const [name,bytes] of Object.entries(files)) { assert.match(name,/^[A-Za-z0-9][A-Za-z0-9.-]*$/); await writeFile(resolve(stage,name),bytes,{flag:'wx'}); }
    await verify(stage);
    await rename(stage,target);
    stageOwned = false;
  } finally {
    try { if(stageOwned) await rm(stage,{force:true,recursive:true}); }
    finally { await rm(lock,{force:true,recursive:true}); }
  }
}
export async function exportRequest(request: unknown, context: BuildContext) {
  const data = freezeJson(request) as {packId:string;version:number;operations:unknown;history:readonly PackSnapshot[];archives:readonly RecipeArchive[]};
  keys(data,['packId','version','operations','history','archives']);
  const replay = await replayArchives(data.archives);
  const build = planPack(PROFILE,{packId:data.packId,version:data.version,operations:data.operations},data.history,replay.fragments);
  return assembleExport({...build,archives:replay.archives},context);
}
