import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { loadE2EEnvironment } from '../../../e2e/environment.js';

const root = resolve('.local/e2e-environment-tests', randomUUID());
const keys = ['DATABASE_URL', 'API_HOST', 'API_PORT', 'WEB_PORT', 'NODE_ENV'] as const;
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const database = 'postgresql://fixture@127.0.0.1:55499/tileset_env_fixture';
const missing = resolve(root, 'missing.env');
beforeAll(async () => {
  await mkdir(root, { recursive: true });
});
beforeEach(() => {
  for (const key of keys) delete process.env[key];
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

it('accepts a missing optional file with explicit CI configuration, without a fallback database', () => {
  Object.assign(process.env, { DATABASE_URL: database, API_PORT: '4398', WEB_PORT: '5298' });
  const config = loadE2EEnvironment(missing);
  expect(config.DATABASE_URL).toBe(database);
  expect([config.API_HOST, config.API_PORT, config.WEB_PORT]).toEqual(['127.0.0.1', 4398, 5298]);
  expect(Object.isFrozen(config)).toBe(true);
});

it('rejects missing required configuration rather than selecting any database', () => {
  expect(() => loadE2EEnvironment(missing)).toThrow('E2E configuration requires DATABASE_URL');
  expect(process.env['DATABASE_URL']).toBeUndefined();
});

it('loads a real dedicated local file and its ports when process values are absent', async () => {
  const file = resolve(root, 'local.env');
  await writeFile(file, `DATABASE_URL=${database}\nAPI_PORT=4398\nWEB_PORT=5298\n`, {
    mode: 0o600,
  });
  const config = loadE2EEnvironment(file);
  expect(config.DATABASE_URL).toBe(database);
  expect([config.API_PORT, config.WEB_PORT]).toEqual([4398, 5298]);
});

it('preserves explicit process values over a real conflicting file', async () => {
  const file = resolve(root, 'precedence.env');
  await writeFile(
    file,
    'DATABASE_URL=postgresql://fixture@127.0.0.1:55498/tileset_other\nAPI_PORT=4310\nWEB_PORT=5173\n',
  );
  Object.assign(process.env, { DATABASE_URL: database, API_PORT: '4398', WEB_PORT: '5298' });
  const config = loadE2EEnvironment(file);
  expect(config.DATABASE_URL).toBe(database);
  expect([config.API_PORT, config.WEB_PORT]).toEqual([4398, 5298]);
  expect(process.env['DATABASE_URL']).toBe(database);
});

it('does not treat an existing file without required configuration as configured', async () => {
  const file = resolve(root, 'incomplete.env');
  await writeFile(file, 'API_PORT=4398\n');
  expect(() => loadE2EEnvironment(file)).toThrow('E2E configuration requires DATABASE_URL');
});

it('rejects a real directory instead of ignoring a non-ENOENT read error', () => {
  process.env['DATABASE_URL'] = database;
  expect(() => loadE2EEnvironment(root)).toThrow(
    'Unable to read the optional local E2E environment file.',
  );
});

it('rejects other I/O failures with a clear top-level message and preserves the cause', () => {
  process.env['DATABASE_URL'] = database;
  vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {
    throw Object.assign(new Error('/private/fixture-secret'), { code: 'EACCES' });
  });
  expect(() => loadE2EEnvironment(missing)).toThrow(
    'Unable to read the optional local E2E environment file.',
  );
  expect(() => loadE2EEnvironment(missing)).not.toThrow('fixture-secret');
  try {
    loadE2EEnvironment(missing);
  } catch (error) {
    expect((error as Error).cause).toMatchObject({ code: 'EACCES' });
  }
});

it.each([
  { DATABASE_URL: '' },
  { DATABASE_URL: 'not-a-url' },
  { DATABASE_URL: 'postgresql://fixture@remote.example/tileset_fixture' },
  { DATABASE_URL: 'postgresql://fixture@127.0.0.1/postgres' },
  { DATABASE_URL: 'https://fixture@127.0.0.1/tileset_fixture' },
  { DATABASE_URL: 'postgresql://127.0.0.1/tileset_fixture' },
  { DATABASE_URL: 'postgresql://fixture@127.0.0.1/tileset_fixture?other=fixture-secret' },
  { API_HOST: '0.0.0.0' },
  { API_PORT: 'not-a-port' },
  { API_PORT: '1023' },
  { WEB_PORT: '65536' },
  { API_PORT: '5173' },
  { NODE_ENV: 'unknown' },
])(
  'rejects invalid explicit configuration before any database client is constructed: case %#',
  (patch) => {
    Object.assign(process.env, { DATABASE_URL: database, ...patch });
    expect(() => loadE2EEnvironment(missing)).toThrow();
    expect(() => loadE2EEnvironment(missing)).not.toThrow('fixture-secret');
  },
);
