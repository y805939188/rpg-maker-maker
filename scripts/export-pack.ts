import { readFile } from 'node:fs/promises';
import { hashBytes } from '@tileset/asset-core';
import { currentBuildContext, exportRequest, publishDirectory, readPackExport } from './pack-export.js';
import { git } from './io.js';

const [requestPath,destination] = process.argv.slice(2);
if (!requestPath || !destination) throw Error('Usage: pnpm export:pack <request.json> <new output directory>');
if (git('status','--porcelain','--untracked-files=all')) throw Error('Commit the candidate before exporting a release Pack.');
const data = await readFile(requestPath); if (data.length > 48*1024*1024) throw Error('Local request exceeds export budget.');
const context = await currentBuildContext(git('rev-parse','HEAD'),hashBytes(await readFile('pnpm-lock.yaml')));
const result = await exportRequest(JSON.parse(data.toString('utf8')),context);
await publishDirectory(destination,result.files,readPackExport);
console.log(JSON.stringify({path:destination,buildId:result.manifest.buildId,manifestSha256:hashBytes(result.files['manifest.json']!)},null,2));
