import { execFileSync } from 'node:child_process';
const checks = [
  [
    '.',
    "import { PROFILE, compileFixedPrototype } from '@tileset/prototype'; if (PROFILE.version !== '1.0.0-candidate.1' || typeof compileFixedPrototype !== 'function') throw Error('prototype export');",
  ],
  [
    'packages/contracts',
    "import { CreateProjectSchema, createOpenApiDocument } from '@tileset/contracts'; if (!CreateProjectSchema.safeParse({name:'test'}).success || createOpenApiDocument().openapi !== '3.0.3') throw Error('contracts export');",
  ],
  [
    'packages/ai-gateway',
    "import { freezeTaskSnapshot, TaskStateSchema } from '@tileset/ai-gateway'; if (typeof freezeTaskSnapshot !== 'function' || TaskStateSchema.parse('SUBMISSION_UNKNOWN') !== 'SUBMISSION_UNKNOWN') throw Error('gateway export');",
  ],
];
for (const [cwd, source] of checks)
  execFileSync(process.execPath, ['--input-type=module', '-e', source], { cwd, stdio: 'inherit' });
console.log('Production Node ESM imports through all three package export maps passed.');
