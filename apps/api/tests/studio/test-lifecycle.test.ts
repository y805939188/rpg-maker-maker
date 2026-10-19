import { it, expect } from 'vitest';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanupOwned, stopOwnedProcess, within } from './test-lifecycle.js';
it('test phase timeout and cancellation remain finite and preserve the original failure', async () => {
  await expect(within(new Promise(() => {}), 20, 'synthetic phase')).rejects.toThrow(
    'synthetic phase',
  );
  const controller = new AbortController();
  const pending = within(new Promise(() => {}), 1000, 'cancelled', controller.signal);
  controller.abort(Error('expected abort'));
  await expect(pending).rejects.toThrow('expected abort');
});
it('all owned cleanup operations run even when the first fails', async () => {
  const called: string[] = [];
  await expect(
    cleanupOwned([
      async () => {
        called.push('browser');
        throw Error('expected');
      },
      async () => {
        called.push('API');
      },
      async () => {
        called.push('DB');
      },
    ]),
  ).rejects.toThrow('Owned test cleanup failed');
  expect(called).toEqual(['browser', 'API', 'DB']);
});
it('owned child descendants are cleaned even after leader exit', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ci-r4-cleanup-'));
  const child = spawn(
    process.execPath,
    [
      '-e',
      `const {spawn}=require('child_process');const fs=require('fs');const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{stdio:'ignore'});fs.writeFileSync('pid',String(child.pid));setTimeout(()=>process.exit(0),100);`,
    ],
    { cwd: dir, detached: true, stdio: 'ignore' },
  );
  try {
    await within(
      new Promise<void>((done) => child.once('exit', () => done())),
      3000,
      'leader exit',
    );
    const pid = Number(await readFile(join(dir, 'pid'), 'utf8'));
    await stopOwnedProcess(child);
    const state = (() => {
      try {
        return execFileSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).trim();
      } catch {
        return '';
      }
    })();
    expect(!state || state.startsWith('Z')).toBe(true);
  } finally {
    await stopOwnedProcess(child);
    await rm(dir, { recursive: true });
  }
});
