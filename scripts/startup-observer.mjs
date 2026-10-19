// Opt-in CI evidence only. This preload never starts, stops or prepares a service.
import { basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';
import { get } from 'node:http';
import { setInterval, clearInterval, setTimeout } from 'node:timers';

const root = fileURLToPath(new URL('../', import.meta.url));
const packages = new Set([
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
]);

export function startupStage(argv, cwd) {
  const main = basename(argv[1] ?? '');
  const directory = relative(root, cwd).replaceAll('\\', '/');
  if (main === 'pnpm' || main === 'pnpm.cjs') {
    if (directory === '' && argv[2] === 'test:e2e') return 'test:e2e';
    const command = argv.slice(2).join(' ');
    if (directory === '' && ['dev', 'build:prototype', 'build:contracts'].includes(command))
      return command === 'build:contracts' ? 'build:dependencies' : command;
    const match = /^--filter @tileset\/([a-z-]+) build$/.exec(command);
    if (directory === '' && match && (packages.has(match[1]) || match[1] === 'api'))
      return 'build:' + match[1];
  }
  if (main === 'tsc' || main === 'tsc.js') {
    if (directory === '') return 'tsc:prototype';
    if (directory === 'apps/api') return 'tsc:api';
    if (directory.startsWith('packages/') && packages.has(directory.slice(9)))
      return 'tsc:' + directory.slice(9);
  }
  if (directory === '' && main === 'studio-resources.js') return 'studio-resources';
  if (directory === '' && main === 'run-local.mjs' && argv[2] === 'dev') return 'run-local:dev';
  if (directory === 'apps/api' && main === 'cli.mjs' && argv[2] === 'watch') return 'api:watch';
  if (directory === 'apps/api' && main === 'main.ts') return 'api:main';
  if (directory === 'apps/web' && main === 'vite.js') return 'web:vite';
}

function tcp(port) {
  if (!port) return Promise.resolve('unconfigured');
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const finish = (state) => {
      socket.destroy();
      resolve(state);
    };
    socket.unref();
    socket.setTimeout(250, () => finish('timeout'));
    socket.once('connect', () => finish('listening'));
    socket.once('error', () => finish('unreachable'));
  });
}

function health(port) {
  return new Promise((resolve) => {
    const request = get({ host: '127.0.0.1', port, path: '/api/health' }, (response) => {
      response.resume();
      resolve(response.statusCode);
    });
    request.on('socket', (socket) => socket.unref());
    request.setTimeout(250, () => request.destroy());
    request.once('error', () => resolve('unreachable'));
  });
}

function port(value, fallback) {
  const number = Number(value ?? fallback);
  return Number.isInteger(number) && number >= 1024 && number <= 65535 ? number : undefined;
}

export function observeStartup(stage, env = process.env) {
  const started = Date.now();
  const inherited = Number(env['TILESET_STARTUP_OBSERVER_EPOCH']);
  const origin = Number.isSafeInteger(inherited) && inherited > 0 ? inherited : started;
  env['TILESET_STARTUP_OBSERVER_EPOCH'] = String(origin);
  const emit = (event, fields = {}) =>
    process.stderr.write(
      '[startup] ' +
        JSON.stringify({
          event,
          stage,
          pid: process.pid,
          ppid: process.ppid,
          elapsed_ms: Date.now() - origin,
          ...fields,
        }) +
        '\n',
    );
  emit('enter');
  process.once('exit', (code) => emit('exit', { code, duration_ms: Date.now() - started }));
  // One observer in the outer E2E process (or direct pnpm dev). Its unref'ed,
  // bounded probes cannot keep a process alive or replace Playwright readiness.
  if (env['TILESET_STARTUP_OBSERVER_OWNER'] || !['test:e2e', 'dev'].includes(stage)) return;
  env['TILESET_STARTUP_OBSERVER_OWNER'] = String(process.pid);
  const api = port(env['API_PORT'], 4310);
  const web = port(env['WEB_PORT'], 5173);
  let database;
  try {
    const url = new URL(env['DATABASE_URL']);
    if (['postgres:', 'postgresql:'].includes(url.protocol) && url.hostname === '127.0.0.1')
      database = port(url.port, 5432);
  } catch {
    /* Configuration values and native errors must never enter evidence. */
  }
  const probe = async () => {
    const [api_tcp, web_tcp, database_tcp, api_health] = await Promise.all([
      tcp(api),
      tcp(web),
      tcp(database),
      api ? health(api) : 'unconfigured',
    ]);
    emit('probe', { api_tcp, web_tcp, database_tcp, api_health });
  };
  void probe();
  const interval = setInterval(() => {
    void probe();
  }, 1000);
  interval.unref();
  setTimeout(() => {
    clearInterval(interval);
    emit('observation_end');
  }, 35000).unref();
}

if (process.env['TILESET_STARTUP_OBSERVE'] === '1') {
  const stage = startupStage(process.argv, process.cwd());
  if (stage) observeStartup(stage);
}
