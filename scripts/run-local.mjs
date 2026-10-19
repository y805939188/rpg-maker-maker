import { mkdir, open, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { get } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { clearTimeout } from 'node:timers';
import { randomBytes } from 'node:crypto';
import { LocalProcesses, localCancellation } from './local-processes.mjs';
import { prepareDevelopment, verifyDevelopment } from './dev-preparation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const emit = (event, fields = {}) =>
  console.log('[local-startup] ' + JSON.stringify({ event, ...fields }));

function listeningProof(entry, launch, role, port) {
  const marker = `[local-listening:${launch}:${role}:${port}]\n`;
  return new Promise((resolve) => {
    let tail = '';
    const observe = (chunk) => {
      tail += chunk.toString();
      if (tail.includes(marker)) {
        entry.child.stdout.removeListener('data', observe);
        resolve();
      } else tail = tail.slice(-marker.length);
    };
    // This is the stdout pipe of this owned command, never a URL or another process's log.
    entry.child.stdout.on('data', observe);
  });
}

export async function assertPortsFree(ports) {
  for (const port of ports) {
    await new Promise((resolve, reject) => {
      const server = createServer();
      server.once('error', () => reject(new Error('Local service port is occupied.')));
      server.listen(port, '127.0.0.1', () => server.close(resolve));
    });
  }
}

export function requestReady(port, path, validate) {
  return new Promise((resolve) => {
    let body = '';
    const finish = (ready) => {
      clearTimeout(timer);
      request.destroy();
      resolve(ready);
    };
    const request = get({ host: '127.0.0.1', port, path, agent: false }, (response) => {
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1024 * 1024) finish(false);
      });
      response.on('end', () => {
        try {
          finish(response.statusCode === 200 && validate(body));
        } catch {
          finish(false);
        }
      });
      response.on('error', () => finish(false));
    });
    const timer = setTimeout(() => finish(false), 500);
    request.on('error', () => finish(false));
  });
}

async function configuration() {
  let local = {};
  try {
    local = parseEnv(await readFile(resolve(root, '.env'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT')
      throw new Error('Unable to read local environment.', { cause: error });
  }
  // Load only launch ports here. API and Vite retain their existing environment boundaries.
  const env = { ...local, ...process.env };
  const api = Number(env.API_PORT ?? 4310),
    web = Number(env.WEB_PORT ?? 5173);
  if (
    ![api, web].every((port) => Number.isInteger(port) && port >= 1024 && port <= 65535) ||
    api === web
  )
    throw new Error('Invalid local port configuration.');
  return { api, web };
}

export async function serve(mode, processes, controller, report = emit, options = {}) {
  const startedAt = Date.now();
  const timer = setTimeout(
    () => controller.abort(new Error('Service readiness exceeded 30000ms.')),
    options.timeout ?? 30000,
  );
  try {
    const receipt =
      mode === 'dev' ? await verifyDevelopment(options.root ?? root, processes) : undefined;
    const ports = options.ports ?? (await configuration());
    await assertPortsFree(mode === 'dev' ? [ports.api, ports.web] : [ports.api]);
    controller.signal.throwIfAborted();
    report('services-start', { budget_ms: 30000 });
    const launch = randomBytes(16).toString('hex');
    const childOptions = {
      cwd: options.root ?? root,
      env: {
        ...processes.environment,
        NODE_ENV: mode === 'dev' ? 'development' : 'production',
        TILESET_STARTUP_LAUNCH: launch,
      },
      stdio: ['ignore', 'pipe', 'inherit'],
    };
    const commands = options.commands ?? [
      [
        'pnpm',
        [
          '--filter',
          '@tileset/api',
          ...(mode === 'dev' ? ['exec', 'tsx', 'src/main.ts'] : ['start']),
        ],
      ],
      ...(mode === 'dev' ? [['pnpm', ['--filter', '@tileset/web', 'dev']]] : []),
    ];
    const children = commands.map(([command, args]) =>
      processes.start(command, args, childOptions),
    );
    const failed = Promise.race(children.map(({ finished }) => finished)).then(() => {
      throw new Error('Local service exited.');
    });
    const listening = children.map((entry, index) => {
      const role = index === 0 ? 'api' : 'web';
      const proof = listeningProof(entry, launch, role, ports[role]);
      entry.child.stdout.pipe(process.stdout);
      return proof;
    });
    await processes.wait(Promise.race([Promise.all(listening), failed]));
    const ready = async () => {
      while (true) {
        controller.signal.throwIfAborted();
        const apiReady = await requestReady(ports.api, '/api/health', (body) => {
          const health = JSON.parse(body);
          return health.status === 'ok' && health.database === 'connected';
        });
        const webReady =
          mode !== 'dev' ||
          ((await requestReady(ports.web, '/', (body) => body.includes('/src/main.tsx'))) &&
            (await requestReady(ports.web, '/src/main.tsx', (body) => body.includes('import'))));
        if (apiReady && webReady) return;
        await delay(100, undefined, { signal: controller.signal });
      }
    };
    await processes.wait(Promise.race([ready(), failed]));
    clearTimeout(timer);
    const service_ms = Date.now() - startedAt;
    report('services-ready', {
      service_ms,
      ...(receipt
        ? { prepare_ms: receipt.duration_ms, total_ms: Date.now() - receipt.startedAt }
        : {}),
    });
    console.log(mode === 'dev' ? 'LOCAL_DEV_READY' : 'LOCAL_PRODUCTION_READY');
    await processes.wait(failed);
  } finally {
    clearTimeout(timer);
  }
}

export async function main(mode) {
  if (!['dev', 'prepare-dev', 'prepared-dev', 'production'].includes(mode))
    throw new Error('Invalid local startup mode.');
  const controller = new globalThis.AbortController();
  const processes = new LocalProcesses(controller.signal);
  let lock;
  const cancellation = localCancellation(controller);
  try {
    await mkdir(resolve(root, '.local'), { recursive: true });
    try {
      lock = await open(resolve(root, '.local/dev-startup.lock'), 'wx', 0o600);
    } catch {
      throw new Error(
        'Another local startup owns this worktree (or its interrupted lock remains).',
      );
    }
    const ports = await configuration();
    await assertPortsFree(mode === 'production' ? [ports.api] : [ports.api, ports.web]);
    if (mode === 'dev' || mode === 'prepare-dev')
      await prepareDevelopment(root, processes, controller, emit);
    if (mode !== 'prepare-dev')
      await serve(mode === 'production' ? 'production' : 'dev', processes, controller);
  } catch (error) {
    controller.abort(error);
    if (lock && (mode === 'dev' || mode === 'prepare-dev'))
      await rm(resolve(root, '.local/dev-preparation.json'), { force: true });
    console.error(error instanceof Error ? error.message : 'Local startup failed.');
    process.exitCode =
      cancellation.signal === 'SIGINT' ? 130 : cancellation.signal === 'SIGTERM' ? 143 : 1;
  } finally {
    await processes.close();
    if (cancellation.signal && (mode === 'dev' || mode === 'prepare-dev'))
      await rm(resolve(root, '.local/dev-preparation.json'), { force: true });
    if (lock) {
      await lock.close();
      await rm(resolve(root, '.local/dev-startup.lock'));
    }
    if (cancellation.signal) process.exitCode = cancellation.signal === 'SIGINT' ? 130 : 143;
    cancellation.dispose();
    emit('stopped', { exit_code: process.exitCode ?? 0 });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main(process.argv[2]);
