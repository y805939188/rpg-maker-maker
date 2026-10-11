import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer as createHttpServer } from 'node:http';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../../../', import.meta.url));
const webRoot = resolve(repository, 'apps/web');
const fixtureName = '.privacy-regression-' + randomUUID();
const webFixture = resolve(webRoot, fixtureName);
const outsideFixture = resolve(repository, 'docs', fixtureName);
const localFixture = resolve(repository, '.local', fixtureName);
const marker = 'TILESET_PRIVATE_CANARY_NOT_A_REAL_SECRET';
const queries = ['', '?raw', '?import', '?raw&import', '?import&raw', '?url'];
const configFile = process.env['TILESET_VITE_TEST_CONFIG'] ?? resolve(webRoot, 'vite.config.ts');
const checks: Record<string, unknown>[] = [];
let server: ChildProcess | undefined;
let origin: string;

const privateFiles: string[] = [];
const artifacts: Record<string, unknown> = {};

async function freePort(): Promise<number> {
  const socket = createHttpServer();
  await new Promise<void>((done) => socket.listen(0, '127.0.0.1', done));
  const address = socket.address();
  if (!address || typeof address === 'string') throw new Error('Missing privacy test port.');
  await new Promise<void>((done, reject) =>
    socket.close((error) => (error ? reject(error) : done())),
  );
  return address.port;
}
beforeAll(async () => {
  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  for (const dir of [webFixture, outsideFixture, localFixture])
    await mkdir(dir, { recursive: true });
  // Every requested sensitive-looking file is a fresh synthetic fixture, never real credentials.
  for (const path of [
    resolve(localFixture, 'private-state.json'),
    resolve(localFixture, 'nested/unpredictable-name.json'),
    resolve(outsideFixture, 'internal-data.json'),
    resolve(webFixture, '.env.privacy-canary'),
    resolve(webFixture, 'fake.pem'),
    resolve(webFixture, 'fake.crt'),
    resolve(webFixture, 'fake.key'),
    resolve(webFixture, '.git/fake-private.json'),
    resolve(webFixture, '.local/nested/fake.json'),
  ]) {
    await mkdir(resolve(path, '..'), { recursive: true });
    await writeFile(path, JSON.stringify({ fakeCanary: marker }), { mode: 0o600, flag: 'wx' });
    privateFiles.push(path);
  }
  const link = resolve(webFixture, 'private-symlink.json');
  await symlink(privateFiles[0]!, link);
  privateFiles.push(link);
  await writeFile(resolve(webFixture, 'public.json'), '{"public":"PUBLIC_ALLOWED_CANARY"}', {
    flag: 'wx',
  });
  artifacts['configSHA256'] = createHash('sha256')
    .update(await readFile(configFile))
    .digest('hex');
  artifacts['configurationBaseline'] = process.env['TILESET_VITE_TEST_BASELINE_SHA'] ?? null;
  artifacts['sourceCommit'] = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repository,
    encoding: 'utf8',
  }).trim();
  artifacts['testSHA256'] = createHash('sha256')
    .update(await readFile(fileURLToPath(import.meta.url)))
    .digest('hex');
  server = spawn('pnpm', ['--filter', '@tileset/web', 'exec', 'vite', '--config', configFile], {
    cwd: repository,
    env: { ...process.env, WEB_PORT: String(port) },
    detached: true,
    stdio: 'pipe',
  });
  let output = '';
  server.stdout?.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  server.stderr?.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null)
      throw new Error('Vite privacy test server exited during startup.');
    try {
      const response = await fetch(origin);
      if (response.status === 200) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for this test's dedicated localhost server. */
    }
    await delay(50);
  }
  artifacts['serverCommand'] = [
    'pnpm',
    '--filter',
    '@tileset/web',
    'exec',
    'vite',
    '--config',
    configFile,
  ];
  artifacts['serverStartupLog'] = output;
  if (!ready) throw new Error('Vite privacy test server did not become ready.');
}, 30000);
afterAll(async () => {
  const evidence = resolve(repository, '.local/dev-privacy');
  await mkdir(evidence, { recursive: true });
  await writeFile(
    resolve(
      evidence,
      process.env['TILESET_VITE_TEST_BASELINE_SHA'] ? 'prior-candidate.json' : 'latest.json',
    ),
    JSON.stringify(
      {
        ...artifacts,
        webOrigin: origin,
        canaryMode: '0600',
        realCredentialFilesReadOrRequested: false,
        queries,
        checks,
      },
      null,
      2,
    ) + '\n',
  );
  // Remove only this test's fresh synthetic directories, preserving all real local state and probes.
  try {
    if (server?.pid && server.exitCode === null) {
      const pid = server.pid;
      const exited = new Promise<void>((done) => server!.once('exit', () => done()));
      process.kill(-pid, 'SIGTERM');
      const force = setTimeout(() => {
        try {
          process.kill(-pid, 'SIGKILL');
        } catch {
          /* Already stopped. */
        }
      }, 3000);
      try {
        await exited;
      } finally {
        clearTimeout(force);
      }
    }
  } finally {
    for (const directory of [webFixture, outsideFixture, localFixture])
      await rm(directory, { recursive: true, force: true });
  }
}, 30000);

async function probe(path: string, requestOrigin?: string) {
  const response = await fetch(
    origin + path,
    requestOrigin ? { headers: { Origin: requestOrigin } } : {},
  );
  const body = await response.text();
  const record = {
    path,
    origin: requestOrigin ?? null,
    status: response.status,
    accessControlAllowOrigin: response.headers.get('access-control-allow-origin'),
    bodyContainsFakeMarker: body.includes(marker),
    bodySHA256: createHash('sha256').update(body).digest('hex'),
  };
  checks.push(record);
  return { ...record, body };
}
describe('actual Vite server privacy boundary (STEP02-R1-001)', () => {
  it('blocks complete private trees, key/env/git fixtures and allowed-tree symlinks for raw/import variants', async () => {
    const results = [];
    for (const file of privateFiles)
      for (const query of queries)
        for (const requestOrigin of [
          origin,
          'http://127.0.0.1:51999',
          'http://localhost:51999',
          undefined,
        ]) {
          results.push(await probe('/@fs/' + file.slice(1) + query, requestOrigin));
        }
    // Also exercise normal web-root URLs and percent-encoded directory names.
    for (const query of queries) {
      results.push(await probe('/' + fixtureName + '/.local/nested/fake.json' + query, origin));
      results.push(
        await probe(
          '/@fs/' + privateFiles[0]!.slice(1).replace('/.local/', '/%2Elocal/') + query,
          origin,
        ),
      );
    }
    const violations = results.filter(
      (record) => record.status !== 403 || record.bodyContainsFakeMarker,
    );
    expect(violations.map(({ body: _body, ...record }) => record)).toEqual([]);
  }, 30000);
  it('rejects other localhost Origins even for public code and preflight', async () => {
    for (const foreign of ['http://127.0.0.1:51999', 'http://localhost:51999', 'null']) {
      const response = await probe('/src/main.tsx', foreign);
      expect(response.status).toBe(403);
      expect(response.accessControlAllowOrigin).toBeNull();
      const preflight = await fetch(origin + '/src/main.tsx', {
        method: 'OPTIONS',
        headers: { Origin: foreign, 'Access-Control-Request-Method': 'GET' },
      });
      expect(preflight.status).toBe(403);
      expect(preflight.headers.get('access-control-allow-origin')).toBeNull();
    }
  });
  it('still loads the normal frontend and shared compiled contract through HTTP', async () => {
    for (const path of [
      '/',
      '/src/main.tsx',
      '/@fs/' + resolve(repository, 'packages/contracts/dist/index.js').slice(1),
      '/' + fixtureName + '/public.json',
    ]) {
      const result = await probe(path, origin);
      expect(result.status, path).toBe(200);
      expect(result.accessControlAllowOrigin).toBe(origin);
    }
  });
});
