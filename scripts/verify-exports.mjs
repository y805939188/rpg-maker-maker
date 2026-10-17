import { execFileSync } from 'node:child_process';
const checks = [
  [
    'packages/pack-export',
    "import {assembleExport,verifyExportFiles} from '@tileset/pack-export'; if(typeof assembleExport !== 'function' || typeof verifyExportFiles !== 'function') throw Error('export package');",
  ],
  [
    'packages/persistence',
    "import {Persistence,AssetStorage,ReplaySession} from '@tileset/persistence'; if(typeof Persistence !== 'function' || typeof AssetStorage !== 'function' || typeof ReplaySession !== 'function') throw Error('persistence export');",
  ],
  [
    'packages/local-executor',
    "import {Executor,MockProvider,HttpsResultReader} from '@tileset/local-executor'; if(typeof Executor !== 'function' || typeof MockProvider !== 'function' || typeof HttpsResultReader !== 'function') throw Error('executor export');",
  ],
  [
    'packages/pack-assembly',
    "import {planPack,PACK_CONTRACT} from '@tileset/pack-assembly'; if(typeof planPack !== 'function' || PACK_CONTRACT !== 'mz-pack-v1') throw Error('pack export');",
  ],
  [
    'packages/mz-compiler',
    "import {compileFragment,FRAGMENT_CONTRACT} from '@tileset/mz-compiler'; if (typeof compileFragment !== 'function' || FRAGMENT_CONTRACT !== 'mz-compiled-fragment-v1') throw Error('compiler export');",
  ],
  [
    '.',
    "import { PROFILE, compileFixedPrototype } from '@tileset/prototype'; if (PROFILE.version !== '1.0.0-candidate.1' || typeof compileFixedPrototype !== 'function') throw Error('prototype export');",
  ],
  [
    'packages/contracts',
    "import { CreateProjectSchema, createOpenApiDocument } from '@tileset/contracts'; if (!CreateProjectSchema.safeParse({name:'test'}).success || createOpenApiDocument().openapi !== '3.0.3') throw Error('contracts export');",
  ],
  [
    'packages/asset-core',
    "import {RgbaImage,DOMAIN_CONTRACT} from '@tileset/asset-core'; if (DOMAIN_CONTRACT !== 'asset-revision-v1' || new RgbaImage({width:1,height:1,data:new Uint8Array([0,0,0,0])}).bytes().length !== 4) throw Error('asset export');",
  ],
  [
    'packages/material-processing',
    "import {sourceOver,PROCESSING_VERSION} from '@tileset/material-processing'; if (PROCESSING_VERSION !== 'fixed-shoreline-v1' || typeof sourceOver !== 'function') throw Error('processing export');",
  ],
  [
    'packages/image-adapter',
    "import {codecRuntime,PNG_POLICY,normalizeOpaqueRgbPng} from '@tileset/image-adapter'; if ((await codecRuntime()).sharp !== '0.35.5' || PNG_POLICY.concurrency !== 1 || typeof normalizeOpaqueRgbPng !== 'function') throw Error('adapter export');",
  ],
  [
    'packages/ai-gateway',
    "import { freezeTaskSnapshot, TaskStateSchema, composeTaskSnapshot } from '@tileset/ai-gateway'; if (typeof freezeTaskSnapshot !== 'function' || typeof composeTaskSnapshot !== 'function' || TaskStateSchema.parse('SUBMISSION_UNKNOWN') !== 'SUBMISSION_UNKNOWN') throw Error('gateway export');",
  ],
];
for (const [cwd, source] of checks)
  execFileSync(process.execPath, ['--input-type=module', '-e', source], { cwd, stdio: 'inherit' });
console.log(`Production Node ESM imports through all ${checks.length} package export maps passed.`);
