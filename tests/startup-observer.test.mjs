import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';
import { startupStage } from '../scripts/startup-observer.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const observer = fileURLToPath(new URL('../scripts/startup-observer.mjs', import.meta.url));
function launch(args, extra = {}) {
  const env = { PATH: process.env['PATH'], TILESET_STARTUP_OBSERVE: '1', ...extra };
  const child = spawn(process.execPath, ['--import=' + observer, ...args], { cwd: root, env });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const done = once(child, 'close').then(([code, signal]) => ({ code, signal, stdout, stderr,
    events: stderr.split('\n').filter(line => line.startsWith('[startup] ')).map(line => JSON.parse(line.slice(10))),
  }));
  return { child, done };
}

async function fixture(source, run) {
  const directory = await mkdtemp(join(tmpdir(), 'startup-observer-'));
  const file = join(directory, 'tsc');
  try { await writeFile(file, source); await run(file); }
  finally { await rm(directory, { recursive: true }); }
}

test('stage labels are allowlisted; command arguments and foreign paths are never labels', () => {
  assert.equal(startupStage(['node', '/bin/pnpm', 'dev'], root), 'dev');
  assert.equal(startupStage(['node', '/bin/pnpm', 'test:e2e', '--config', '/SECRET'], root), 'test:e2e');
  assert.equal(startupStage(['node', '/bin/tsc'], join(root, 'packages/contracts')), 'tsc:contracts');
  assert.equal(startupStage(['node', '/bin/studio-resources.js'], root), 'studio-resources');
  assert.equal(startupStage(['node', '/bin/run-local.mjs', 'dev'], root), 'run-local:dev');
  assert.equal(startupStage(['node', '/bin/pnpm', '--filter', '@tileset/api', 'build'], root), 'build:api');
  assert.equal(startupStage(['node', '/private/SECRET.ts'], root), undefined);
  assert.equal(startupStage(['node', '/bin/pnpm', 'dev SECRET'], root), undefined);
  assert.equal(startupStage(['node', '/bin/tsc'], '/private/SECRET'), undefined);
});

test('disabled preload leaves stdout, failure code and telemetry unchanged', async () => {
  await fixture("console.log('original'); process.exitCode = 7;", async file => {
    const result = await launch([file], { TILESET_STARTUP_OBSERVE: '0' }).done;
    assert.equal(result.stdout, 'original\n');
    assert.equal(result.code, 7);
    assert.equal(result.stderr, '');
  });
});

test('observed startup success and failure keep original exits and do not linger', async () => {
  for (const code of [0, 7]) {
    await fixture(`console.log('original'); process.exitCode = ${code};`, async file => {
      const result = await launch([file]).done;
      assert.equal(result.stdout, 'original\n');
      assert.equal(result.code, code);
      assert.deepEqual(result.events.map(event => event.event), ['enter', 'exit']);
      assert.equal(result.events[1].code, code);
      assert.equal(result.events[1].stage, 'tsc:prototype');
    });
  }
});

test('probes report occupied ports and health transitions without bodies, keys, paths or DB credentials', async () => {
  let requests = 0;
  const server = createServer((_request, response) => {
    response.statusCode = ++requests === 1 ? 503 : 200;
    response.end('SECRET_BODY');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const source = `import { observeStartup } from ${JSON.stringify('file://' + observer)};
    observeStartup('dev'); setTimeout(() => { console.log('original'); }, 1300);`;
  const running = launch(['--input-type=module', '-e', source], {
    API_PORT: String(port), WEB_PORT: String(port),
    DATABASE_URL: `postgresql://SECRET_USER:SECRET_PASSWORD@127.0.0.1:${port}/SECRET_DB`,
    TILESET_PROVIDER_ENV_FILE: '/SECRET_PATH/DO_NOT_READ', OPENAI_API_KEY: 'SECRET_KEY',
  });
  try {
    const result = await running.done;
    assert.equal(result.code, 0);
    assert.equal(result.stdout, 'original\n');
    const probes = result.events.filter(event => event.event === 'probe');
    assert.deepEqual(probes.map(event => event.api_health), [503, 200]);
    assert.ok(probes.every(event => event.api_tcp === 'listening' && event.web_tcp === 'listening' && event.database_tcp === 'listening'));
    assert.ok(!result.stderr.includes('SECRET'));
    assert.ok(result.events.at(-1).duration_ms < 3000);
  } finally {
    if (running.child.exitCode === null) running.child.kill('SIGKILL');
    await new Promise(resolve => server.close(resolve));
  }
});

test('SIGTERM cancellation retains the original signal and leaves no observer process', async () => {
  await fixture("console.log('ready'); setInterval(() => {}, 1000);", async file => {
    const running = launch([file]);
    try {
      await once(running.child.stdout, 'data');
      running.child.kill('SIGTERM');
      const result = await running.done;
      assert.equal(result.code, null);
      assert.equal(result.signal, 'SIGTERM');
      assert.throws(() => process.kill(running.child.pid, 0), { code: 'ESRCH' });
    } finally {
      if (running.child.exitCode === null && running.child.signalCode === null) running.child.kill('SIGKILL');
    }
  });
});

test('unreachable or invalid configuration is reduced to finite states, without delaying exit', async () => {
  const source = `import { observeStartup } from ${JSON.stringify('file://' + observer)};
    observeStartup('dev'); setTimeout(() => {}, 300);`;
  const result = await launch(['--input-type=module', '-e', source], {
    API_PORT: 'SECRET_INVALID', WEB_PORT: 'SECRET_INVALID', DATABASE_URL: 'SECRET_INVALID',
  }).done;
  assert.equal(result.code, 0);
  const probe = result.events.find(event => event.event === 'probe');
  for (const key of ['api_tcp', 'web_tcp', 'database_tcp', 'api_health']) assert.equal(probe[key], 'unconfigured');
  assert.ok(!result.stderr.includes('SECRET'));
  await setTimeout(1);
});
