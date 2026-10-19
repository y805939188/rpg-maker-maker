import { createHash } from 'node:crypto';
import {
  access,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clearTimeout } from 'node:timers';
import { LocalProcesses, localCancellation } from './local-processes.mjs';
import { preparationInputs } from './dev-preparation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const receiptName = '.local/ci-preparation.json';
const outputRoots = [
  'dist',
  'apps/api/dist',
  'apps/web/dist',
  ...[
    'contracts',
    'ai-gateway',
    'asset-core',
    'material-processing',
    'image-adapter',
    'mz-compiler',
    'pack-assembly',
    'pack-export',
    'persistence',
    'local-executor',
  ].map((name) => `packages/${name}/dist`),
];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const emit = (event, fields = {}) =>
  console.log('[prepared-ci] ' + JSON.stringify({ event, ...fields }));

export function checkEnvironment(input = process.env) {
  const allowed = [
    'PATH',
    'HOME',
    'USER',
    'LOGNAME',
    'TMPDIR',
    'TZ',
    'CI',
    'FORCE_COLOR',
    'NO_COLOR',
    'XDG_CACHE_HOME',
    'PNPM_HOME',
    'npm_config_cache',
    'npm_config_userconfig',
    'npm_config_globalconfig',
    'DATABASE_URL',
    'TILESET_ASSET_ROOT',
    'TILESET_PG_BIN',
    'API_HOST',
    'API_PORT',
    'WEB_PORT',
    'INTEGRATION_API_PORT',
    'STEP07_TEST_API_PORT',
    'STEP08_TEST_API_PORT',
    'STEP09_TEST_API_PORT',
    'PLAYWRIGHT_BROWSERS_PATH',
    'GIT_CONFIG_NOSYSTEM',
    'GIT_CONFIG_SYSTEM',
    'GIT_CONFIG_GLOBAL',
    'GIT_TERMINAL_PROMPT',
  ];
  return {
    ...Object.fromEntries(
      allowed.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]),
    ),
    TILESET_AI_MODE: 'mock',
  };
}

export const preparedTargets = {
  typecheck: {
    timeout: 120000,
    commands: [
      ['pnpm', ['exec', 'tsc', '--noEmit']],
      ['pnpm', ['exec', 'tsc', '-p', 'tsconfig.tests.json']],
      ['pnpm', ['-r', '--filter', './apps/*', '--filter', './packages/*', 'typecheck']],
    ],
  },
  unit: { timeout: 300000, commands: [['pnpm', ['exec', 'vitest', 'run']]], test: true },
  integration: {
    timeout: 120000,
    commands: [['pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.integration.config.ts']]],
    test: true,
  },
  step06: {
    timeout: 600000,
    commands: [['pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.step06.config.ts']]],
    test: true,
  },
  step07: {
    timeout: 1080000,
    commands: [['pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.step07.config.ts']]],
    test: true,
  },
  step08: {
    timeout: 300000,
    commands: [['pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.step08.config.ts']]],
    test: true,
  },
  step09: {
    timeout: 600000,
    commands: [['pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.step09.config.ts']]],
    test: true,
  },
  exports: { timeout: 30000, commands: [['pnpm', ['verify:exports']]] },
  migrate: { timeout: 60000, commands: [['pnpm', ['db:migrate']]] },
  // Production keeps Playwright's case/service limits and the CI job limit, without a suite timer.
  production: { timeout: null, commands: [['pnpm', ['test:e2e']]] },
};

async function outputInventory(directory, signal) {
  const files = {};
  async function visit(path) {
    signal.throwIfAborted();
    const state = await lstat(resolve(directory, path));
    if (state.isSymbolicLink()) throw new Error('Prepared output cannot be a symlink.');
    if (state.isDirectory())
      for (const name of (await readdir(resolve(directory, path))).sort())
        await visit(path + '/' + name);
    else if (state.isFile()) files[path] = hash(await readFile(resolve(directory, path)));
    else throw new Error('Invalid prepared output.');
  }
  for (const path of outputRoots) await visit(path);
  const required = [
    'dist/src/index.js',
    'dist/src/index.d.ts',
    'dist/scripts/studio-resources.js',
    'apps/api/dist/main.js',
    'apps/api/dist/resources/studio.json',
    'apps/web/dist/index.html',
  ];
  for (const path of outputRoots.filter((path) => path.startsWith('packages/'))) {
    const pkg = JSON.parse(await readFile(resolve(directory, path, '../package.json'), 'utf8'));
    const targets = JSON.stringify(pkg.exports).match(/\.\/dist\/[^" ]+/g) ?? [];
    if (!targets.length) throw new Error('Missing prepared package exports.');
    for (const target of targets)
      required.push(path.replace(/\/dist$/, '') + '/' + target.slice(2));
  }
  for (const path of required)
    if (!files[path]) throw new Error('Missing required prepared output.');
  return files;
}

async function buildState(directory, processes) {
  const inputs = await preparationInputs(directory, processes);
  const outputs = await outputInventory(directory, processes.signal);
  const resources = JSON.parse(
    await readFile(resolve(directory, 'apps/api/dist/resources/studio.json'), 'utf8'),
  );
  if (
    resources.context?.commit !== inputs.commit ||
    resources.context?.node !== inputs.node ||
    resources.context?.lockSha256 !== inputs.files['pnpm-lock.yaml']
  )
    throw new Error('Prepared resources do not match current source/toolchain.');
  return { inputs, outputs };
}

export async function prepareChecks(directory, processes, controller, report = emit, options = {}) {
  const receipt = resolve(directory, receiptName),
    started = Date.now();
  const timer = setTimeout(
    () => controller.abort(new Error('CI preparation exceeded 120000ms.')),
    options.timeout ?? 120000,
  );
  try {
    await mkdir(resolve(directory, '.local'), { recursive: true });
    await rm(receipt, { force: true });
    report('prepare-start', { budget_ms: 120000 });
    const before = await preparationInputs(directory, processes);
    for (const [command, args] of options.commands ?? [['pnpm', ['build']]])
      await processes.run(command, args, { cwd: directory });
    const state = await buildState(directory, processes);
    if (!equal(before, state.inputs))
      throw new Error('Source/configuration/toolchain changed during CI preparation.');
    controller.signal.throwIfAborted();
    const result = {
      version: 1,
      root: directory,
      startedAt: started,
      duration_ms: Date.now() - started,
      ...state,
    };
    await writeFile(receipt + '.tmp', JSON.stringify(result) + '\n', { mode: 0o600 });
    controller.signal.throwIfAborted();
    await rename(receipt + '.tmp', receipt);
    controller.signal.throwIfAborted();
    report('prepare-ready', {
      prepare_ms: result.duration_ms,
      outputs: Object.keys(state.outputs).length,
    });
    return result;
  } catch (error) {
    await rm(receipt, { force: true });
    throw error;
  } finally {
    clearTimeout(timer);
    await rm(receipt + '.tmp', { force: true });
  }
}

export async function verifyChecks(directory, processes) {
  try {
    const receipt = JSON.parse(await readFile(resolve(directory, receiptName), 'utf8'));
    if (
      receipt.version !== 1 ||
      receipt.root !== directory ||
      !equal(
        { inputs: receipt.inputs, outputs: receipt.outputs },
        await buildState(directory, processes),
      )
    )
      throw new Error();
    return receipt;
  } catch {
    throw new Error('CI preparation is missing or stale. Run pnpm ci:prepare.');
  }
}

export async function runPrepared(
  directory,
  processes,
  controller,
  target,
  extra = [],
  report = emit,
) {
  const spec = preparedTargets[target];
  if (!spec || (extra.length && !spec.test))
    throw new Error('Unknown prepared target or unsupported arguments.');
  const started = Date.now(),
    timer =
      spec.timeout === null
        ? null
        : setTimeout(
            () =>
              controller.abort(new Error('Prepared check phase exceeded its bounded deadline.')),
            spec.timeout,
          );
  try {
    const receipt = await verifyChecks(directory, processes);
    report('check-start', { target, budget_ms: spec.timeout, commit: receipt.inputs.commit });
    for (const [index, [command, args]] of spec.commands.entries()) {
      report('command-start', { target, index });
      await processes.run(command, [...args, ...extra], { cwd: directory });
    }
    await verifyChecks(directory, processes);
    report('check-pass', { target, duration_ms: Date.now() - started });
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

async function main() {
  const controller = new globalThis.AbortController(),
    processes = new LocalProcesses(controller.signal, checkEnvironment());
  const cancellation = localCancellation(controller);
  let lock;
  try {
    await mkdir(resolve(root, '.local'), { recursive: true });
    lock = await open(resolve(root, '.local/ci-checks.lock'), 'wx', 0o600);
    let devActive = false;
    try {
      await access(resolve(root, '.local/dev-startup.lock'));
      devActive = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (devActive)
      throw new Error('A local startup owns this worktree; preparation/checks refused.');
    if (process.argv[2] === 'prepare') await prepareChecks(root, processes, controller);
    else if (process.argv[2] === 'run') {
      const extra = process.argv.slice(4);
      if (extra[0] === '--') extra.shift();
      await runPrepared(root, processes, controller, process.argv[3], extra);
    } else throw new Error('Expected prepare or run <target>.');
  } catch (error) {
    controller.abort(error);
    console.error(error instanceof Error ? error.message : 'Prepared CI command failed.');
    process.exitCode =
      cancellation.signal === 'SIGINT' ? 130 : cancellation.signal === 'SIGTERM' ? 143 : 1;
  } finally {
    await processes.close();
    if (cancellation.signal && process.argv[2] === 'prepare')
      await rm(resolve(root, receiptName), { force: true });
    if (lock) {
      await lock.close();
      await rm(resolve(root, '.local/ci-checks.lock'));
    }
    if (cancellation.signal) process.exitCode = cancellation.signal === 'SIGINT' ? 130 : 143;
    cancellation.dispose();
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
