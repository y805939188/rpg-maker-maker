import { spawn } from 'node:child_process';
const mode = process.argv[2];
if (!['dev', 'production'].includes(mode)) throw new Error('Expected dev or production mode.');
const children = [];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}
function run(name, args, environment) {
  const child = spawn('pnpm', ['--filter', name, ...args], {
    stdio: 'inherit',
    env: { ...process.env, ...environment },
  });
  children.push(child);
  child.on('error', () => {
    console.error('Local process could not start.');
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
if (mode === 'dev') {
  run('@tileset/api', ['exec', 'tsx', 'watch', 'src/main.ts'], { NODE_ENV: 'development' });
  run('@tileset/web', ['dev'], { NODE_ENV: 'development' });
} else run('@tileset/api', ['start'], { NODE_ENV: 'production' });
process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));
