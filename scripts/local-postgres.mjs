import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const owned = resolve(root, '.local/postgres');
const data = resolve(owned, 'data');
const binary = process.env['TILESET_PG_BIN'] ?? '/opt/homebrew/opt/postgresql@14/bin';
const command = process.argv[2];
function run(name, args, environment = {}) {
  const result = spawnSync(resolve(binary, name), args, {
    stdio: 'inherit',
    env: { ...process.env, ...environment },
  });
  if (result.error || result.status !== 0)
    throw new Error(`Dedicated PostgreSQL command failed: ${name}`);
}
async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
async function configuration() {
  const input = JSON.parse(await readFile(resolve(owned, 'ownership.json'), 'utf8'));
  if (
    input.owner !== 'ai-tileset-studio-step02' ||
    input.root !== root ||
    !Number.isInteger(input.port) ||
    input.port < 1024 ||
    input.port > 65535 ||
    input.database !== 'tileset_studio' ||
    typeof input.password !== 'string' ||
    !/^[a-f0-9]{48}$/.test(input.password)
  )
    throw new Error('Dedicated cluster ownership/configuration mismatch.');
  return input;
}
try {
  if (command === 'init') {
    if (await exists(resolve(root, '.env')))
      throw new Error(
        'Existing .env is preserved. Configure a dedicated cluster manually or use a clean worktree.',
      );
    const port = Number(process.env['TILESET_PG_PORT'] ?? 55432);
    if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 5432)
      throw new Error('Use a dedicated port other than 5432.');
    await mkdir(resolve(root, '.local'), { recursive: true });
    await mkdir(owned); // Exclusive: no reuse/deletion/overwrite of an existing cluster.
    const password = randomBytes(24).toString('hex');
    const pw = resolve(owned, 'init-password');
    await writeFile(pw, password + '\n', { mode: 0o600, flag: 'wx' });
    try {
      run('initdb', [
        '-D',
        data,
        '--username=tileset',
        '--pwfile=' + pw,
        '--auth-local=scram-sha-256',
        '--auth-host=scram-sha-256',
        '--encoding=UTF8',
        '--locale=C',
      ]);
    } finally {
      await rm(pw, { force: true });
    }
    await writeFile(
      resolve(data, 'postgresql.auto.conf'),
      `listen_addresses = '127.0.0.1'\nport = ${port}\nunix_socket_directories = ''\n`,
      { flag: 'w', mode: 0o600 },
    );
    await writeFile(
      resolve(owned, 'ownership.json'),
      JSON.stringify({
        owner: 'ai-tileset-studio-step02',
        root,
        port,
        password,
        database: 'tileset_studio',
      }),
      { flag: 'wx', mode: 0o600 },
    );
    run('pg_ctl', ['-D', data, '-l', resolve(owned, 'server.log'), '-w', 'start']);
    run('createdb', ['-h', '127.0.0.1', '-p', String(port), '-U', 'tileset', 'tileset_studio'], {
      PGPASSWORD: password,
    });
    await writeFile(
      resolve(root, '.env'),
      `API_HOST=127.0.0.1\nAPI_PORT=4310\nWEB_PORT=5173\nDATABASE_URL=postgresql://tileset:${password}@127.0.0.1:${port}/tileset_studio\n`,
      { flag: 'wx', mode: 0o600 },
    );
    console.log(
      `Dedicated cluster ready on 127.0.0.1:${port}; credentials stored only in ignored local files.`,
    );
  } else {
    await configuration();
    if (command === 'start')
      run('pg_ctl', ['-D', data, '-l', resolve(owned, 'server.log'), '-w', 'start']);
    else if (command === 'stop') run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
    else if (command === 'status') run('pg_ctl', ['-D', data, 'status']);
    else throw new Error('Use init, start, stop or status.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Dedicated PostgreSQL setup failed.');
  process.exitCode = 1;
}
