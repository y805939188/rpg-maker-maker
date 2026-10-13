import { fork } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runRoot, databaseUrl } from './helpers.js';
export async function runProcess(input: unknown, stopAt?: string) {
  const path = resolve(runRoot, randomUUID() + '.json');
  await writeFile(path, JSON.stringify(input));
  const child = fork(resolve('dist/scripts/step06-process.js'), [path], {
    env: { ...process.env, DATABASE_URL: databaseUrl! },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  const events: string[] = [];
  let errors = '';
  child.stderr?.on('data', (chunk) => {
    errors += String(chunk);
  });
  const result = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (accept, reject) => {
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(Error('Child checkpoint timed out'));
      }, 30000);
      child.on('message', (message: unknown) => {
        if (
          message &&
          typeof message === 'object' &&
          'point' in message &&
          typeof message.point === 'string'
        ) {
          events.push(message.point);
          if (message.point === stopAt) child.kill('SIGKILL');
        }
      });
      child.on('error', reject);
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        accept({ code, signal });
      });
    },
  );
  if (!stopAt && result.code !== 0) throw Error('Child process failed: ' + errors);
  return { pid: child.pid, ...result, events };
}
export const encodePrepared = (prepared: { files: Record<string, Uint8Array> }) => ({
  ...prepared,
  files: Object.fromEntries(
    Object.entries(prepared.files).map(([n, b]) => [n, Buffer.from(b).toString('base64')]),
  ),
});
