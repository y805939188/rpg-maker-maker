import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile, rm, access, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { execFileSync, spawn } from 'node:child_process';
import { LocalProcesses } from '../scripts/local-processes.mjs';
import { prepareDevelopment, verifyDevelopment } from '../scripts/dev-preparation.mjs';
import { assertPortsFree, requestReady, serve } from '../scripts/run-local.mjs';
import {
  fixtureGit,
  initializeFixtureGit,
  startupFixtureEnvironment,
} from './helpers/startup-fixture-git.mjs';

const environment = startupFixtureEnvironment();
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
const quiet = () => {};
async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'startup-chain-'));
  const controller = new globalThis.AbortController();
  await writeFile(resolve(root, 'empty-npmrc'), '');
  const processes = new LocalProcesses(controller.signal, {
    ...environment,
    npm_config_userconfig: resolve(root, 'empty-npmrc'),
    npm_config_globalconfig: resolve(root, 'empty-npmrc'),
    GIT_CEILING_DIRECTORIES: dirname(await realpath(root)),
  });
  const put = async (path, value = 'fixture') => {
    await mkdir(resolve(root, path, '..'), { recursive: true });
    await writeFile(resolve(root, path), value);
  };
  try {
    const git = await initializeFixtureGit(root, processes.environment);
    for (const path of ['src', 'scripts', 'tests', 'packages', 'apps/api', 'e2e'])
      await mkdir(resolve(root, path), { recursive: true });
    await put('src/input.ts');
    await put('pnpm-lock.yaml');
    await put('package.json', '{}');
    await put('tsconfig.json', '{}');
    await put('node_modules/.pnpm/lock.yaml');
    await put('node_modules/.modules.yaml');
    await put('dist/scripts/studio-resources.js');
    await put('apps/api/dist/main.js');
    await put('apps/api/dist/resources/studio.json', '{}');
    for (const name of packages) {
      await put(
        `packages/${name}/package.json`,
        JSON.stringify({
          exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } },
        }),
      );
      await put(`packages/${name}/src/index.ts`);
      await put(`packages/${name}/dist/index.js`);
      await put(`packages/${name}/dist/index.d.ts`);
    }
    const prepare = (options = {}) =>
      prepareDevelopment(root, processes, controller, quiet, { commands: [], ...options });
    await run({ root, put, controller, processes, prepare, git });
  } finally {
    controller.abort();
    await processes.close();
    await rm(root, { recursive: true, force: true });
  }
}
const receiptFile = (root) => resolve(root, '.local/dev-preparation.json');
const verify = (root, processes) => verifyDevelopment(root, processes);

// These .mjs cases are deliberately outside the existing Vitest *.test.ts collection.
test('current successful preparation accepts exact outputs; env credentials are not inventoried', async () => {
  await fixture(async ({ root, put, prepare, processes, git }) => {
    await put('apps/api/.env.local', 'SYNTHETIC_SECRET=never-inventory');
    await prepare();
    const receipt = await verify(root, processes);
    assert.equal(receipt.inputs.commit, git.head);
    const sanitized = startupFixtureEnvironment({
      ...environment,
      GIT_DIR: root,
      GIT_WORK_TREE: root,
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_GLOBAL: resolve(root, 'foreign-config'),
      GIT_AUTHOR_NAME: 'Untrusted inherited identity',
    });
    for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_CONFIG_COUNT'])
      assert.equal(sanitized[key], undefined);
    assert.equal(sanitized.GIT_CONFIG_GLOBAL, '/dev/null');
    assert.equal(sanitized.GIT_AUTHOR_NAME, 'Synthetic Startup Fixture');
    assert.ok(Object.keys(receipt.outputs).length >= 23);
    assert.ok(!JSON.stringify(receipt.inputs).includes('SYNTHETIC_SECRET'));
    assert.ok(!Object.keys(receipt.inputs.files).some((path) => path.includes('.env.local')));
  });
});

for (const invalid of ['missing repository', 'unborn HEAD']) {
  test(`formal preparation rejects fixture Git with ${invalid}`, async () => {
    await fixture(async ({ root, prepare, processes }) => {
      await prepare();
      if (invalid === 'missing repository') await rm(resolve(root, '.git'), { recursive: true });
      else
        fixtureGit(root, processes.environment, ['update-ref', '-d', 'refs/heads/startup-fixture']);
      assert.throws(() =>
        fixtureGit(root, processes.environment, ['rev-parse', '--verify', 'HEAD^{commit}']),
      );
      await assert.rejects(prepare(), /Preparation toolchain probe failed/);
      await assert.rejects(access(receiptFile(root)));
      await assert.rejects(verify(root, processes), /missing or stale/);
      console.log(
        '[startup-fixture-negative] ' +
          JSON.stringify({
            root: await realpath(root),
            invalid,
            formalPrepareRejected: true,
            receiptAbsent: true,
          }),
      );
    });
  });
}

test('missing, malformed and incomplete preparation never accept old dist', async () => {
  await fixture(async ({ root, put, prepare, processes }) => {
    await assert.rejects(verify(root, processes), /missing or stale/);
    await put('.local/dev-preparation.json', '{broken');
    await assert.rejects(verify(root, processes), /missing or stale/);
    await put('.local/dev-preparation.json', '{}');
    await assert.rejects(verify(root, processes), /missing or stale/);
    await prepare();
    await rm(resolve(root, 'packages/contracts/dist/index.js'));
    await assert.rejects(verify(root, processes), /missing or stale/);
    await assert.rejects(prepare());
    await assert.rejects(access(receiptFile(root)));
  });
});

test('changed or added outputs and source/lock/config/installed toolchain all invalidate', async () => {
  await fixture(async ({ root, put, prepare, processes }) => {
    for (const path of [
      'dist/scripts/studio-resources.js',
      'apps/api/dist/resources/studio.json',
      'packages/contracts/dist/extra.js',
      'src/input.ts',
      'src/new.ts',
      'pnpm-lock.yaml',
      'tsconfig.json',
      'node_modules/.pnpm/lock.yaml',
      'node_modules/.modules.yaml',
    ]) {
      await prepare();
      await put(path, 'changed-' + path);
      await assert.rejects(verify(root, processes), /missing or stale/, path);
    }
    await prepare();
    await rm(resolve(root, 'src/input.ts'));
    await assert.rejects(verify(root, processes), /missing or stale/);
  });
});

test('a failed rebuild removes an earlier successful receipt even with all old outputs present', async () => {
  await fixture(async ({ root, prepare, processes }) => {
    await prepare();
    await assert.rejects(
      prepare({ commands: [[process.execPath, ['-e', 'process.exit(7)']]] }),
      /command failed/,
    );
    await assert.rejects(access(receiptFile(root)));
    await assert.rejects(verify(root, processes), /missing or stale/);
  });
});

test('source changes during preparation cannot publish a successful receipt', async () => {
  await fixture(async ({ root, prepare }) => {
    await assert.rejects(
      prepare({
        commands: [
          [
            process.execPath,
            ['-e', "require('fs').writeFileSync('src/input.ts','mid-build-change')"],
          ],
        ],
      }),
      /changed during preparation/,
    );
    await assert.rejects(access(receiptFile(root)));
  });
});

test('preparation timeout and cancellation invalidate earlier success and terminate descendants', async () => {
  for (const cancel of [false, true]) {
    await fixture(async ({ root, prepare, controller, processes }) => {
      await prepare();
      const source = `const {spawn}=require('child_process'); const fs=require('fs'); const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{}); setInterval(()=>{},1000)"],{stdio:'ignore'}); fs.writeFileSync('descendant.pid',String(child.pid)); process.on('SIGTERM',()=>{}); setInterval(()=>{},1000);`;
      const pending = prepare({
        timeout: cancel ? 5000 : 1200,
        commands: [[process.execPath, ['-e', source]]],
      });
      if (cancel) {
        await eventually(async () => {
          await access(resolve(root, 'descendant.pid'));
        });
        controller.abort(new Error('synthetic cancellation'));
      }
      await assert.rejects(pending, cancel ? /cancellation/ : /120000ms/);
      await assert.rejects(access(receiptFile(root)));
      // fixture's finally owns group cleanup; check it explicitly before returning.
      const pid = Number(await readFile(resolve(root, 'descendant.pid'), 'utf8'));
      assert.ok(pid > 0);
      await processes.close();
      await eventually(() => assert.equal(alive(pid), false));
    });
  }
});

async function eventually(check, timeout = 3000) {
  const start = Date.now();
  while (true) {
    try {
      await check();
      return;
    } catch (error) {
      if (Date.now() - start > timeout) throw error;
      await delay(30);
    }
  }
}
function alive(pid) {
  try {
    return !execFileSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' })
      .trim()
      .startsWith('Z');
  } catch {
    return false;
  }
}
async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}
async function close(server) {
  await new Promise((resolve) => server.close(resolve));
}

test('occupied ports reject without killing or reusing the existing server', async () => {
  const server = createServer((_, response) => response.end('other-session'));
  const port = await listen(server);
  try {
    await assert.rejects(assertPortsFree([port]), /occupied/);
    assert.equal(await requestReady(port, '/', (body) => body === 'other-session'), true);
  } finally {
    await close(server);
  }
});

test('HTTP readiness rejects unhealthy DB, malformed bodies, incomplete and hanging responses', async () => {
  let body = '{"status":"ok","database":"disconnected"}';
  const server = createServer((_, response) => {
    if (body !== 'hang') response.end(body);
  });
  const port = await listen(server);
  const health = (text) => JSON.parse(text).database === 'connected';
  try {
    assert.equal(await requestReady(port, '/api/health', health), false);
    body = '{broken';
    assert.equal(await requestReady(port, '/api/health', health), false);
    body = '{"status":"ok","database":"connected"}';
    assert.equal(await requestReady(port, '/api/health', health), true);
    body = 'hang';
    const start = Date.now();
    assert.equal(await requestReady(port, '/api/health', health), false);
    assert.ok(Date.now() - start < 1500);
  } finally {
    server.closeAllConnections();
    await close(server);
  }
});

test('cleanup kills a TERM-resistant grandchild after its leader has exited, preserving unrelated server', async () => {
  const controller = new globalThis.AbortController(),
    owner = new LocalProcesses(controller.signal, environment);
  const directory = await mkdtemp(join(tmpdir(), 'startup-process-'));
  const server = createServer((_, response) => response.end('untouched'));
  const port = await listen(server);
  try {
    const entry = owner.start(
      process.execPath,
      [
        '-e',
        `const {spawn}=require('child_process'); const fs=require('fs'); const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{stdio:'ignore'});fs.writeFileSync('pid',String(child.pid));setTimeout(()=>process.exit(0),200);`,
      ],
      { cwd: directory, stdio: 'ignore' },
    );
    await entry.finished;
    const pid = Number(await readFile(resolve(directory, 'pid'), 'utf8'));
    assert.equal(alive(pid), true);
    await owner.close();
    await eventually(() => assert.equal(alive(pid), false));
    assert.equal(await requestReady(port, '/', (body) => body === 'untouched'), true);
  } finally {
    await owner.close();
    await close(server);
    await rm(directory, { recursive: true });
  }
});

async function freePorts() {
  const first = createServer(),
    second = createServer();
  const api = await listen(first),
    web = await listen(second);
  await close(first);
  await close(second);
  return { api, web };
}
function fakeServer(port, body, lifetime, role = 'api', proof = 'valid') {
  return [
    process.execPath,
    [
      '-e',
      `require('http').createServer((req,res)=>res.end(${JSON.stringify(body)})).listen(${port},'127.0.0.1',()=>{if(${JSON.stringify(proof)}!=='missing')console.log('[local-listening:'+(${JSON.stringify(proof)}==='valid'?process.env.TILESET_STARTUP_LAUNCH:'wrong-launch')+':${role}:${port}]')});${lifetime ? `setTimeout(()=>process.exit(7),${lifetime});` : ''}`,
    ],
  ];
}

test('both real HTTP gates are required before the ready event; cancellation cleans both services', async () => {
  await fixture(async ({ root, prepare, processes, controller }) => {
    await prepare();
    const ports = await freePorts(),
      events = [];
    const running = serve(
      'dev',
      processes,
      controller,
      (event) => {
        events.push(event);
        if (event === 'services-ready') controller.abort(new Error('synthetic stop after ready'));
      },
      {
        root,
        ports,
        commands: [
          fakeServer(ports.api, '{"status":"ok","database":"connected"}'),
          fakeServer(ports.web, '<script src="/src/main.tsx">import</script>', undefined, 'web'),
        ],
        timeout: 3000,
      },
    );
    await assert.rejects(running, /synthetic stop after ready/);
    assert.deepEqual(events, ['services-start', 'services-ready']);
    await processes.close();
    await assertPortsFree([ports.api, ports.web]);
  });
});

test('service exit, spawn failure and frontend-not-ready never emit ready from an old preparation', async () => {
  for (const scenario of ['exit', 'spawn', 'web']) {
    await fixture(async ({ root, prepare, processes, controller }) => {
      await prepare();
      const ports = await freePorts(),
        events = [];
      const api =
        scenario === 'spawn'
          ? ['/definitely-absent-startup-program', []]
          : fakeServer(
              ports.api,
              '{"status":"ok","database":"connected"}',
              scenario === 'exit' ? 150 : undefined,
            );
      await assert.rejects(
        serve('dev', processes, controller, (event) => events.push(event), {
          root,
          ports,
          commands: [api, fakeServer(ports.web, 'not-the-frontend', undefined, 'web')],
          timeout: 800,
        }),
        scenario === 'web' ? /30000ms/ : /service exited/,
      );
      assert.ok(!events.includes('services-ready'));
      controller.abort();
      await processes.close();
      await assertPortsFree([ports.api, ports.web]);
    });
  }
});

test('repeated SIGINT/SIGTERM forwarding keeps cancellation handlers until descendant cleanup finishes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'startup-signals-'));
  const helper = new URL('../scripts/local-processes.mjs', import.meta.url).href;
  const source = `import {LocalProcesses,localCancellation} from ${JSON.stringify(helper)};
    import {writeFile} from 'node:fs/promises';
    const controller=new AbortController(), cancellation=localCancellation(controller), owner=new LocalProcesses(controller.signal);
    const entry=owner.start(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{stdio:'ignore'});
    await writeFile('pid',String(entry.child.pid)); console.log('SIGNALS_READY');
    try { await owner.wait(entry.finished); } catch {} finally { await owner.close(); console.log('CLEANED_'+cancellation.signal); cancellation.dispose(); process.exitCode=130; }`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', source], {
    cwd: directory,
    env: environment,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  child.stdout.on('data', (data) => {
    stdout += data;
  });
  const finished = new Promise((resolve) =>
    child.once('close', (code, signal) => resolve({ code, signal })),
  );
  try {
    await eventually(() => assert.ok(stdout.includes('SIGNALS_READY')));
    const pid = Number(await readFile(resolve(directory, 'pid'), 'utf8'));
    child.kill('SIGINT');
    await delay(30);
    child.kill('SIGINT');
    await delay(30);
    child.kill('SIGTERM');
    assert.deepEqual(await finished, { code: 130, signal: null });
    assert.ok(stdout.includes('CLEANED_SIGINT'));
    await eventually(() => assert.equal(alive(pid), false));
  } finally {
    child.kill('SIGTERM');
    await finished;
    await rm(directory, { recursive: true });
  }
});

for (const [mode, contender] of [
  ['dev', 'api'],
  ['dev', 'web'],
  ['production', 'api'],
]) {
  test(`post-precheck ${mode} ${contender} contender cannot substitute for an owned listener`, async () => {
    await fixture(async ({ root, prepare, processes, controller }) => {
      await prepare();
      const ports = await freePorts(),
        events = [];
      const foreign = createServer((_, response) =>
        response.end(
          contender === 'api'
            ? '{"status":"ok","database":"connected","foreign":true}'
            : '<script src="/src/main.tsx">import foreign</script>',
        ),
      );
      const delayed = (role, body) => [
        process.execPath,
        [
          '-e',
          `setTimeout(()=>{require('http').createServer((req,res)=>res.end(${JSON.stringify(body)})).listen(${ports[role]},'127.0.0.1',()=>{if(process.env.TILESET_STARTUP_LAUNCH)console.log('[local-listening:'+process.env.TILESET_STARTUP_LAUNCH+':${role}:${ports[role]}]')})},${contender === role ? 1500 : 0});`,
        ],
      ];
      try {
        await assert.rejects(
          serve(
            mode,
            processes,
            controller,
            (event) => {
              events.push(event);
              if (event === 'services-start') foreign.listen(ports[contender], '127.0.0.1');
            },
            {
              root,
              ports,
              commands: [
                delayed('api', '{"status":"ok","database":"connected"}'),
                ...(mode === 'dev'
                  ? [delayed('web', '<script src="/src/main.tsx">import</script>')]
                  : []),
              ],
              timeout: 4000,
            },
          ),
          /Local service exited/,
        );
        controller.abort();
        await processes.close();
        assert.equal(
          await requestReady(ports[contender], '/', (body) => body.includes('foreign')),
          true,
        );
        assert.ok(
          !events.includes('services-ready'),
          'foreign HTTP must not produce services-ready or the ready marker',
        );
      } finally {
        controller.abort();
        await processes.close();
        await close(foreign);
        await assertPortsFree([ports.api, ports.web]);
      }
    });
  });
}

for (const proof of ['missing', 'wrong-launch']) {
  test(`valid HTTP without this launch's owned listening proof rejects (${proof})`, async () => {
    await fixture(async ({ root, prepare, processes, controller }) => {
      await prepare();
      const ports = await freePorts(),
        events = [];
      await assert.rejects(
        serve('dev', processes, controller, (event) => events.push(event), {
          root,
          ports,
          commands: [
            fakeServer(
              ports.api,
              '{"status":"ok","database":"connected"}',
              undefined,
              'api',
              proof,
            ),
            fakeServer(ports.web, '<script src="/src/main.tsx">import</script>', undefined, 'web'),
          ],
          timeout: 1200,
        }),
        /30000ms/,
      );
      assert.ok(!events.includes('services-ready'));
      controller.abort();
      await processes.close();
      await assertPortsFree([ports.api, ports.web]);
    });
  });
}
