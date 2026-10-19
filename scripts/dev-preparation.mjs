import { createHash } from 'node:crypto';
import {
  access,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { delimiter, resolve } from 'node:path';
import { clearTimeout } from 'node:timers';

const receiptPath = '.local/dev-preparation.json';
const excluded = new Set(['node_modules', 'dist', '.local', '.git']);
const outputRoots = [
  'dist',
  'apps/api/dist',
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

async function executableHash(command, root, environment) {
  for (const directory of (environment.PATH ?? '').split(delimiter)) {
    const path = resolve(root, directory, command);
    try {
      await access(path);
    } catch {
      continue;
    }
    return hash(await readFile(await realpath(path)));
  }
  throw new Error('Required preparation executable is unavailable.');
}

async function inventory(root, paths, signal) {
  const files = {};
  async function visit(path) {
    signal.throwIfAborted();
    const absolute = resolve(root, path);
    const state = await lstat(absolute);
    if (state.isSymbolicLink()) throw new Error('Preparation input/output cannot be a symlink.');
    if (state.isDirectory()) {
      for (const name of (await readdir(absolute)).sort()) {
        if (!excluded.has(name) && (!name.startsWith('.env') || name === '.env.example'))
          await visit(`${path}/${name}`);
      }
    } else if (state.isFile()) files[path] = hash(await readFile(absolute));
    else throw new Error('Invalid preparation input/output.');
  }
  for (const path of paths) await visit(path);
  return files;
}

export async function preparationInputs(root, processes) {
  const signal = processes.signal;
  // Conservative: include source trees (also untracked additions), fixtures and root configs.
  // Never traverse local state, credentials, node_modules or previous outputs.
  const configs = (await readdir(root))
    .filter((name) => /(?:\.(?:json|ya?ml|[cm]?ts|mjs)|^\.nvmrc$|^\.npmrc$)$/.test(name))
    .sort();
  const files = await inventory(
    root,
    ['src', 'scripts', 'tests', 'packages', 'apps', 'e2e', ...configs],
    signal,
  );
  const commit = await processes.output('git', ['rev-parse', 'HEAD'], { cwd: root });
  const pnpm = await processes.output('pnpm', ['--version'], { cwd: root });
  const installedLock = hash(await readFile(resolve(root, 'node_modules/.pnpm/lock.yaml')));
  const modules = hash(await readFile(resolve(root, 'node_modules/.modules.yaml')));
  return {
    files,
    commit: commit.trim(),
    node: process.versions.node,
    pnpm: pnpm.trim(),
    platform: process.platform,
    arch: process.arch,
    nodeBinary: hash(await readFile(process.execPath)),
    pnpmBinary: await executableHash('pnpm', root, processes.environment),
    installedLock,
    modules,
  };
}

async function preparationOutputs(root, signal) {
  const required = [
    'dist/scripts/studio-resources.js',
    'apps/api/dist/main.js',
    'apps/api/dist/resources/studio.json',
  ];
  for (const directory of outputRoots.filter((path) => path.startsWith('packages/'))) {
    const manifest = JSON.parse(
      await readFile(resolve(root, directory, '../package.json'), 'utf8'),
    );
    const targets = JSON.stringify(manifest.exports).match(/\.\/dist\/[^" ]+/g) ?? [];
    if (!targets.length) throw new Error('Missing package exports for development preparation.');
    for (const target of targets) required.push(`${directory}/../${target}`);
  }
  for (const path of required) {
    signal.throwIfAborted();
    if (!(await lstat(resolve(root, path))).isFile())
      throw new Error('Missing development output.');
  }
  return inventory(root, outputRoots, signal);
}

export async function prepareDevelopment(root, processes, controller, emit, options = {}) {
  const startedAt = Date.now();
  const timer = setTimeout(
    () => controller.abort(new Error('Preparation exceeded 120000ms.')),
    options.timeout ?? 120000,
  );
  const receipt = resolve(root, receiptPath);
  try {
    await rm(receipt, { force: true });
    emit('prepare-start', { budget_ms: 120000 });
    const inputs = await preparationInputs(root, processes);
    // Clean only outputs this development preparation rebuilds, preserving production Web output.
    if (!options.commands)
      for (const path of outputRoots)
        await rm(resolve(root, path), { recursive: true, force: true });
    for (const [command, args] of options.commands ?? [
      ['pnpm', ['build:prototype']],
      ['pnpm', ['--filter', '@tileset/api', 'build']],
      [process.execPath, ['dist/scripts/studio-resources.js']],
    ])
      await processes.run(command, args, { cwd: root });
    const outputs = await preparationOutputs(root, controller.signal);
    if (JSON.stringify(inputs) !== JSON.stringify(await preparationInputs(root, processes)))
      throw new Error('Source/configuration/toolchain changed during preparation.');
    controller.signal.throwIfAborted();
    const result = {
      version: 1,
      root,
      startedAt,
      duration_ms: Date.now() - startedAt,
      inputs,
      outputs,
    };
    await mkdir(resolve(root, '.local'), { recursive: true });
    await writeFile(`${receipt}.tmp`, JSON.stringify(result) + '\n', { mode: 0o600 });
    controller.signal.throwIfAborted();
    await rename(`${receipt}.tmp`, receipt);
    controller.signal.throwIfAborted();
    emit('prepare-ready', { prepare_ms: result.duration_ms });
    return result;
  } catch (error) {
    await rm(receipt, { force: true });
    throw error;
  } finally {
    clearTimeout(timer);
    await rm(`${receipt}.tmp`, { force: true });
  }
}

export async function verifyDevelopment(root, processes) {
  try {
    const receipt = JSON.parse(await readFile(resolve(root, receiptPath), 'utf8'));
    if (
      receipt.version !== 1 ||
      receipt.root !== root ||
      !Number.isFinite(receipt.duration_ms) ||
      !Number.isFinite(receipt.startedAt) ||
      JSON.stringify(receipt.inputs) !== JSON.stringify(await preparationInputs(root, processes)) ||
      JSON.stringify(receipt.outputs) !==
        JSON.stringify(await preparationOutputs(root, processes.signal))
    )
      throw new Error();
    return receipt;
  } catch {
    throw new Error(
      'Development preparation is missing or stale. Run pnpm dev:prepare (or pnpm dev).',
    );
  }
}
