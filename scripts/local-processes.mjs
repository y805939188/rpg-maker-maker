import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// pnpm/shell wrappers can forward the same signal again while cleanup is awaiting children.
// Keep both handlers installed until every owned group has been stopped.
export function localCancellation(controller) {
  const state = { signal: undefined };
  const interrupt = (signal) => {
    state.signal ??= signal;
    controller.abort(new Error('Local startup cancelled.'));
  };
  const onInt = () => interrupt('SIGINT'),
    onTerm = () => interrupt('SIGTERM');
  process.on('SIGINT', onInt);
  process.on('SIGTERM', onTerm);
  state.dispose = () => {
    process.removeListener('SIGINT', onInt);
    process.removeListener('SIGTERM', onTerm);
  };
  return state;
}

// Every child has its own POSIX process group. Only groups created here are signalled.
export class LocalProcesses {
  children = [];

  constructor(signal, environment = process.env) {
    this.signal = signal;
    this.environment = environment;
  }

  start(command, args, options = {}) {
    this.signal.throwIfAborted();
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: this.environment,
      ...options,
      detached: true,
    });
    const finished = new Promise((resolve) => {
      child.once('error', () => resolve({ code: 1 }));
      child.once('exit', (code, signal) => resolve({ code, signal }));
    });
    const entry = { child, finished };
    this.children.push(entry);
    return entry;
  }

  async wait(promise) {
    this.signal.throwIfAborted();
    let abort;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          abort = () => reject(this.signal.reason);
          this.signal.addEventListener('abort', abort, { once: true });
        }),
      ]);
    } finally {
      this.signal.removeEventListener('abort', abort);
    }
  }

  async run(command, args, options) {
    const result = await this.wait(this.start(command, args, options).finished);
    if (result.code !== 0) throw new Error('Preparation command failed.');
  }

  async output(command, args, options) {
    const entry = this.start(command, args, { ...options, stdio: ['ignore', 'pipe', 'ignore'] });
    let output = '';
    entry.child.stdout.on('data', (chunk) => {
      if (output.length <= 65536) output += chunk;
      if (output.length > 65536) entry.child.kill('SIGTERM');
    });
    const result = await this.wait(entry.finished);
    if (result.code !== 0 || output.length > 65536)
      throw new Error('Preparation toolchain probe failed.');
    return output.trim();
  }

  async close() {
    const send = (signal) => {
      for (const { child } of this.children) {
        if (!child.pid) continue;
        try {
          process.kill(-child.pid, signal);
        } catch (error) {
          if (error.code !== 'ESRCH') throw error;
        }
      }
    };
    send('SIGTERM');
    // Leaders can exit before their descendants. Keep ownership of the group until escalation.
    await delay(1000);
    send('SIGKILL');
    await Promise.all(this.children.map(({ finished }) => finished));
  }
}
