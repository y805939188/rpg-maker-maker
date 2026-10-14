import { randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

const project = process.cwd();
const root = resolve('.local/e2e-environment-entry-tests', randomUUID());
mkdirSync(root, { recursive: true });
const guard = resolve(root, 'no-effects.cjs');
writeFileSync(
  guard,
  `
const fs = require('node:fs');
const deny = kind => function () {
  fs.appendFileSync(process.env.ENV_IO_GUARD_EVENTS, kind + '\\n');
  throw Error('ENV_IO_FORBIDDEN_' + kind);
};
const net = require('node:net');
net.Socket.prototype.connect = deny('NETWORK');
net.Server.prototype.listen = deny('LISTEN');
net.connect = net.createConnection = deny('NETWORK');
const cp = require('node:child_process');
for (const key of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork']) cp[key] = deny('SERVICE');
require('node:module').syncBuiltinESMExports();
`,
);

function fixture(name: string) {
  const directory = resolve(root, name);
  mkdirSync(directory);
  const events = resolve(directory, 'guard-events.txt');
  writeFileSync(events, '');
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: 'postgresql://fixture@127.0.0.1:55499/tileset_env_entry',
    NODE_OPTIONS: '--require=' + guard,
    ENV_IO_GUARD_EVENTS: events,
  };
  for (const key of ['API_HOST', 'API_PORT', 'WEB_PORT', 'E2E_MODE'])
    delete env[key as keyof typeof env];
  return { directory, events, env };
}

function collect(f: ReturnType<typeof fixture>) {
  const result = spawnSync(
    process.execPath,
    [
      resolve(project, 'node_modules/@playwright/test/cli.js'),
      'test',
      '--list',
      '--config',
      resolve(project, 'playwright.config.ts'),
    ],
    { cwd: f.directory, env: f.env, encoding: 'utf8', timeout: 12000 },
  );
  writeFileSync(resolve(f.directory, 'stdout.log'), result.stdout ?? '');
  writeFileSync(resolve(f.directory, 'stderr.log'), result.stderr ?? '');
  expect(result.error).toBeUndefined();
  expect(readFileSync(f.events, 'utf8')).toBe('');
  expect((result.stdout ?? '') + (result.stderr ?? '')).not.toContain('ENV_IO_CONTENT_SENTINEL');
  expect((result.stdout ?? '') + (result.stderr ?? '')).not.toContain(f.directory);
  return result;
}

it('enforces the real startup guard against network, listening and service launch', () => {
  for (const [name, code] of [
    ['NETWORK', "require('node:net').connect(1, '127.0.0.1')"],
    ['LISTEN', "require('node:net').createServer().listen(0)"],
    ['SERVICE', "require('node:child_process').spawn(process.execPath, ['-e', '0'])"],
  ]) {
    const f = fixture('guard-' + name);
    const result = spawnSync(process.execPath, ['-e', code!], {
      cwd: f.directory,
      env: f.env,
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(readFileSync(f.events, 'utf8')).toBe(name + '\n');
  }
});

it('collects the actual 18 tests for genuinely absent optional env with valid CI configuration', () => {
  const result = collect(fixture('absent'));
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Total: 18 tests');
});

it('collects the actual config with a normal local file and explicit process values taking precedence', () => {
  const f = fixture('local');
  writeFileSync(
    resolve(f.directory, '.env'),
    'DATABASE_URL=invalid-file-value\nAPI_PORT=4398\nWEB_PORT=5298\n',
    { mode: 0o600 },
  );
  const result = collect(f);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Total: 18 tests');
});

it('rejects a real existing mode000 env in the actual Playwright config before discovery or effects', () => {
  expect(process.getuid?.(), 'real permission regression requires a non-root process').not.toBe(0);
  const f = fixture('unreadable'),
    file = resolve(f.directory, '.env');
  writeFileSync(file, 'API_PORT=4398\nWEB_PORT=5298\nENV_IO_SENTINEL=ENV_IO_CONTENT_SENTINEL\n', {
    mode: 0o600,
  });
  chmodSync(file, 0);
  try {
    expect(() => readFileSync(file)).toThrow(expect.objectContaining({ code: 'EACCES' }));
    const result = collect(f);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unable to read the optional local E2E environment file.');
    expect(result.stdout).not.toContain('Total: 18 tests');
  } finally {
    chmodSync(file, 0o600);
  }
});

it('rejects an actual directory env at the real config entry', () => {
  const f = fixture('directory');
  mkdirSync(resolve(f.directory, '.env'));
  const result = collect(f);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Unable to read the optional local E2E environment file.');
});

it('rejects missing and invalid required configuration at the real entry without effects', () => {
  for (const name of ['missing', 'invalid']) {
    const f = fixture(name);
    if (name === 'missing') delete f.env.DATABASE_URL;
    else f.env.DATABASE_URL = 'not-a-database-url';
    const result = collect(f);
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('Total: 18 tests');
    expect(result.stderr).toContain(
      name === 'missing'
        ? 'E2E configuration requires DATABASE_URL'
        : 'Invalid local server configuration.',
    );
  }
});
