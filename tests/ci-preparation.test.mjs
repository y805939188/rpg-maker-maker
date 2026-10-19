import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  access,
  realpath,
  copyFile,
} from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { LocalProcesses } from '../scripts/local-processes.mjs';
import {
  prepareChecks,
  verifyChecks,
  checkEnvironment,
  preparedTargets,
  runPrepared,
} from '../scripts/ci-prepared.mjs';
import { initializeFixtureGit, startupFixtureEnvironment } from './helpers/startup-fixture-git.mjs';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const packages = [
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
];
async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'ci-prepared-')),
    controller = new globalThis.AbortController();
  const env = {
    ...startupFixtureEnvironment(),
    GIT_CEILING_DIRECTORIES: dirname(await realpath(root)),
    npm_config_userconfig: resolve(root, 'empty-npmrc'),
    npm_config_globalconfig: resolve(root, 'empty-npmrc'),
  };
  await writeFile(resolve(root, 'empty-npmrc'), '');
  const processes = new LocalProcesses(controller.signal, env);
  const put = async (path, body = 'fixture') => {
    await mkdir(resolve(root, path, '..'), { recursive: true });
    await writeFile(resolve(root, path), body);
  };
  try {
    const git = await initializeFixtureGit(root, env);
    for (const path of ['src', 'scripts', 'tests', 'packages', 'apps', 'e2e'])
      await mkdir(resolve(root, path), { recursive: true });
    for (const path of [
      'src/index.ts',
      'pnpm-lock.yaml',
      'node_modules/.pnpm/lock.yaml',
      'node_modules/.modules.yaml',
    ])
      await put(path);
    await put('package.json', '{}');
    for (const name of packages) {
      await put(
        `packages/${name}/package.json`,
        JSON.stringify({
          exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } },
        }),
      );
      await put(`packages/${name}/dist/index.js`);
      await put(`packages/${name}/dist/index.d.ts`);
    }
    for (const path of [
      'dist/src/index.js',
      'dist/src/index.d.ts',
      'dist/scripts/studio-resources.js',
      'apps/api/dist/main.js',
      'apps/web/dist/index.html',
    ])
      await put(path);
    const context = {
      commit: git.head,
      node: process.versions.node,
      lockSha256: hash(await readFile(resolve(root, 'pnpm-lock.yaml'))),
    };
    await put('apps/api/dist/resources/studio.json', JSON.stringify({ context }));
    const prepare = (options) =>
      prepareChecks(root, processes, controller, () => {}, { commands: [], ...options });
    await run({ root, controller, processes, put, prepare });
  } finally {
    controller.abort();
    await processes.close();
    await rm(root, { recursive: true, force: true });
  }
}
const receipt = (root) => resolve(root, '.local/ci-preparation.json');
test('successful full-output preparation accepts the same current source and generated resources', async () => {
  await fixture(async ({ root, processes, prepare }) => {
    await prepare();
    const result = await verifyChecks(root, processes);
    assert.equal(result.root, root);
    assert.ok(result.outputs['apps/web/dist/index.html']);
    assert.ok(result.outputs['apps/api/dist/main.js']);
  });
});
test('prepared checks reject missing receipt, missing/changed/extra output and changed source/config/install/toolchain identity', async () => {
  await fixture(async ({ root, processes, prepare, put }) => {
    await assert.rejects(verifyChecks(root, processes), /missing or stale/);
    for (const path of [
      'apps/web/dist/index.html',
      'apps/api/dist/main.js',
      'src/index.ts',
      'package.json',
      'node_modules/.modules.yaml',
    ]) {
      await prepare();
      await put(path, path === 'package.json' ? '{}\n' : 'changed');
      await assert.rejects(verifyChecks(root, processes), /missing or stale/);
    }
    await prepare();
    await rm(resolve(root, 'packages/contracts/dist/index.js'));
    await assert.rejects(verifyChecks(root, processes), /missing or stale/);
    await put('packages/contracts/dist/index.js');
    await prepare();
    await put('dist/extra.js');
    await assert.rejects(verifyChecks(root, processes), /missing or stale/);
  });
});
test('resources bound to another commit or lock are rejected even when all dist paths exist', async () => {
  await fixture(async ({ root, put, prepare }) => {
    await put(
      'apps/api/dist/resources/studio.json',
      JSON.stringify({
        context: {
          commit: '0'.repeat(40),
          node: process.versions.node,
          lockSha256: '0'.repeat(64),
        },
      }),
    );
    await assert.rejects(prepare(), /resources do not match/);
    await assert.rejects(access(receipt(root)));
  });
});
test('failed or cancelled current preparation cannot accept an earlier successful receipt', async () => {
  await fixture(async ({ root, processes, prepare }) => {
    await prepare();
    await assert.rejects(
      prepare({ commands: [[process.execPath, ['-e', 'process.exit(7)']]] }),
      /command failed/,
    );
    await assert.rejects(access(receipt(root)));
    await assert.rejects(verifyChecks(root, processes), /missing or stale/);
  });
  await fixture(async ({ root, prepare, controller }) => {
    await prepare();
    const failed = prepare({
      commands: [[process.execPath, ['-e', 'setInterval(()=>{},1000)']]],
      timeout: 700,
    });
    await assert.rejects(failed, /120000ms/);
    assert.ok(controller.signal.aborted);
    await assert.rejects(access(receipt(root)));
  });
});
test('prepared target mapping keeps original configs, production JS entry and only strips prerequisite builds', () => {
  for (const [target, config] of Object.entries({
    integration: 'integration',
    step06: 'step06',
    step07: 'step07',
    step08: 'step08',
    step09: 'step09',
  })) {
    assert.deepEqual(preparedTargets[target].commands, [
      ['pnpm', ['exec', 'vitest', 'run', '--config', `vitest.${config}.config.ts`]],
    ]);
  }
  assert.deepEqual(preparedTargets.unit.commands, [['pnpm', ['exec', 'vitest', 'run']]]);
  assert.deepEqual(preparedTargets.production.commands, [['pnpm', ['test:e2e']]]);
  assert.deepEqual(preparedTargets.exports.commands, [['pnpm', ['verify:exports']]]);
  assert.ok(!JSON.stringify(preparedTargets).includes('build:contracts'));
});
test('check child environment removes real Provider/config injection and fixes Mock', () => {
  const env = checkEnvironment({
    PATH: '/safe',
    DATABASE_URL: 'synthetic',
    TILESET_AI_MODE: 'wavespeed',
    WAVESPEED_API_KEY: 'synthetic-never-forward',
    TILESET_PROVIDER_CONFIG: 'foreign',
    NODE_OPTIONS: 'foreign',
  });
  assert.deepEqual(env, { PATH: '/safe', DATABASE_URL: 'synthetic', TILESET_AI_MODE: 'mock' });
});

test('prepared runner executes only after validation and rejects changed artifacts after execution', async () => {
  await fixture(async ({ root, processes, controller, prepare, put }) => {
    const calls = [];
    processes.run = async (command, args) => {
      calls.push([command, args]);
    };
    await assert.rejects(
      runPrepared(root, processes, controller, 'exports', [], () => {}),
      /missing or stale/,
    );
    assert.equal(calls.length, 0);
    await prepare();
    await runPrepared(root, processes, controller, 'exports', [], () => {});
    assert.deepEqual(calls, [['pnpm', ['verify:exports']]]);
    calls.length = 0;
    await put('src/index.ts', 'new-source');
    await assert.rejects(
      runPrepared(root, processes, controller, 'exports', [], () => {}),
      /missing or stale/,
    );
    assert.equal(calls.length, 0);
    await prepare();
    processes.run = async () => {
      await put('apps/api/dist/main.js', 'unexpected-output-write');
    };
    await assert.rejects(
      runPrepared(root, processes, controller, 'exports', [], () => {}),
      /missing or stale/,
    );
  });
});

test('production creates no suite timer; every other target retains its exact deadline', async (t) => {
  const budgets = {
    typecheck: 120000,
    unit: 300000,
    integration: 120000,
    step06: 600000,
    step07: 1080000,
    step08: 300000,
    step09: 600000,
    exports: 30000,
    migrate: 60000,
  };
  assert.equal(preparedTargets.production.timeout, null);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(preparedTargets)
        .filter(([name]) => name !== 'production')
        .map(([name, spec]) => [name, spec.timeout]),
    ),
    budgets,
  );
  await fixture(async ({ root, processes, controller, prepare }) => {
    await prepare();
    processes.run = async () => {};
    const events = [];
    const timer = t.mock.method(globalThis, 'setTimeout');
    try {
      await runPrepared(root, processes, controller, 'production', [], (event, fields) =>
        events.push({ event, ...fields }),
      );
      assert.equal(timer.mock.callCount(), 0);
      assert.equal(events.find((event) => event.event === 'check-start').budget_ms, null);
      assert.equal(events.at(-1).event, 'check-pass');
      for (const [target, budget] of Object.entries(budgets)) {
        const before = timer.mock.callCount();
        await runPrepared(root, processes, controller, target, [], () => {});
        assert.equal(timer.mock.callCount(), before + 1);
        assert.equal(timer.mock.calls.at(-1).arguments[1], budget);
      }
      // Trigger the real bounded-target callback, without waiting for its 30s deadline.
      processes.run = async () => {
        timer.mock.calls.at(-1).arguments[0]();
        await processes.wait(Promise.resolve());
      };
      await assert.rejects(
        runPrepared(root, processes, controller, 'exports', [], () => {}),
        /bounded deadline/,
      );
      assert.ok(controller.signal.aborted);
    } finally {
      timer.mock.restore();
    }
  });
});

test('production preserves before/after verification and real pnpm subcommand failure', async () => {
  await fixture(async ({ root, processes, controller, prepare, put }) => {
    await put('package.json', JSON.stringify({ scripts: { 'test:e2e': 'node scripts/e2e.mjs' } }));
    await put(
      'scripts/e2e.mjs',
      `import { readFile, writeFile } from 'node:fs/promises';
const action = (await readFile('.local/action', 'utf8')).trim();
await writeFile('.local/production-ran', String(process.pid));
if (action === 'source') await writeFile('src/index.ts', 'source drift');
if (action === 'output') await writeFile('apps/api/dist/main.js', 'output drift');
if (action === 'fail') process.exit(7);
`,
    );
    const events = [];
    const run = () =>
      runPrepared(root, processes, controller, 'production', [], (event) => events.push(event));
    await assert.rejects(run(), /missing or stale/);
    await assert.rejects(access(resolve(root, '.local/production-ran')));
    await prepare();
    await put('.local/action', 'success');
    await run();
    assert.equal(events.at(-1), 'check-pass');
    await verifyChecks(root, processes);
    for (const path of ['src/index.ts', 'apps/api/dist/main.js']) {
      await prepare();
      await rm(resolve(root, '.local/production-ran'), { force: true });
      await put(path, 'pre-execution drift');
      await assert.rejects(run(), /missing or stale/);
      await assert.rejects(access(resolve(root, '.local/production-ran')));
    }
    for (const action of ['source', 'output', 'fail']) {
      await prepare();
      await put('.local/action', action);
      events.length = 0;
      await assert.rejects(run(), action === 'fail' ? /command failed/ : /missing or stale/);
      assert.ok((await readFile(resolve(root, '.local/production-ran'), 'utf8')).length > 0);
      assert.ok(events.includes('command-start'));
      assert.ok(!events.includes('check-pass'));
    }
    // A real nonzero command is still a failure even when it leaves valid outputs.
    await verifyChecks(root, processes);
  });
});

async function until(check) {
  const deadline = Date.now() + 10000;
  while (!(await check())) {
    assert.ok(Date.now() < deadline, 'Synthetic child observation deadline exceeded.');
    await delay(20);
  }
}

test('production CLI propagates failure and external cancellation, reaps descendants and releases its lock', async () => {
  await fixture(async ({ root, processes, prepare, put }) => {
    for (const name of ['ci-prepared.mjs', 'dev-preparation.mjs', 'local-processes.mjs'])
      await copyFile(
        new URL('../scripts/' + name, import.meta.url),
        resolve(root, 'scripts', name),
      );
    await put('package.json', JSON.stringify({ scripts: { 'test:e2e': 'node scripts/e2e.mjs' } }));
    await put(
      'scripts/e2e.mjs',
      `import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
if ((await readFile('.local/action', 'utf8')).trim() === 'fail') process.exit(7);
process.on('SIGTERM', () => {});
const child = spawn(process.execPath, ['-e', \
  "process.on('SIGTERM',()=>{}); require('node:fs').writeFileSync('.local/descendant-ready',String(process.pid)); setInterval(()=>{},1000)"], { stdio: 'inherit' });
await writeFile('.local/production-pids.json', JSON.stringify([process.pid, child.pid]));
setInterval(() => {}, 1000);
`,
    );
    await prepare();
    const start = () => {
      const entry = processes.start(
        process.execPath,
        [resolve(root, 'scripts/ci-prepared.mjs'), 'run', 'production'],
        { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let output = '';
      for (const stream of [entry.child.stdout, entry.child.stderr])
        stream.on('data', (chunk) => (output += chunk));
      return { ...entry, output: () => output };
    };
    await put('.local/action', 'fail');
    const failed = start();
    assert.equal((await processes.wait(failed.finished)).code, 1);
    assert.match(failed.output(), /command failed/);
    assert.ok(!failed.output().includes('"event":"check-pass"'));
    await assert.rejects(access(resolve(root, '.local/ci-checks.lock')));
    await put('.local/action', 'cancel');
    const cancelled = start();
    await until(async () => {
      try {
        await access(resolve(root, '.local/descendant-ready'));
        await access(resolve(root, '.local/production-pids.json'));
        return true;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return false;
      }
    });
    const pids = JSON.parse(await readFile(resolve(root, '.local/production-pids.json'), 'utf8'));
    assert.equal(Number(await readFile(resolve(root, '.local/descendant-ready'), 'utf8')), pids[1]);
    await access(resolve(root, '.local/ci-checks.lock'));
    assert.equal(cancelled.child.kill('SIGTERM'), true);
    assert.equal((await processes.wait(cancelled.finished)).code, 143);
    assert.ok(!cancelled.output().includes('"event":"check-pass"'));
    await assert.rejects(access(resolve(root, '.local/ci-checks.lock')));
    await until(async () =>
      pids.every((pid) => {
        try {
          process.kill(pid, 0);
          return false;
        } catch (error) {
          if (error.code !== 'ESRCH') throw error;
          return true;
        }
      }),
    );
    await verifyChecks(root, processes);
    console.log(
      '[production-wrapper-cleanup] ' +
        JSON.stringify({ pids, failureExit: 1, cancelExit: 143, reaped: true, lockAbsent: true }),
    );
  });
});
