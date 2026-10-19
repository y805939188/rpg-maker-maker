import type { ChildProcess } from 'node:child_process';

/** Test-only deadlines; caller still owns/release-cancels the underlying operation. */
export async function within<T>(
  promise: Promise<T>,
  milliseconds: number,
  label: string,
  signal?: AbortSignal,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    signal?.throwIfAborted();
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Error('Test phase deadline: ' + label)), milliseconds);
        abort = () => reject(signal!.reason);
        signal?.addEventListener('abort', abort, { once: true });
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (abort) signal?.removeEventListener('abort', abort);
  }
}

export async function stopOwnedProcess(child: ChildProcess) {
  if (!child.pid) return;
  const send = (signal: NodeJS.Signals) => {
    try {
      process.kill(-child.pid!, signal);
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) throw error;
    }
  };
  const closed =
    child.exitCode !== null || child.signalCode !== null
      ? Promise.resolve()
      : new Promise<void>((done) => child.once('exit', () => done()));
  send('SIGTERM');
  // Reap the owned leader and also stop descendants that outlive it.
  await new Promise<void>((done) => setTimeout(done, 1000));
  send('SIGKILL');
  await within(closed, 3000, 'owned process exit');
}

/** Attempt every owned cleanup even if an earlier browser/context close fails. */
export async function cleanupOwned(operations: Array<() => Promise<unknown>>) {
  const failures: unknown[] = [];
  for (const operation of operations)
    try {
      await operation();
    } catch (error) {
      failures.push(error);
    }
  if (failures.length) throw new AggregateError(failures, 'Owned test cleanup failed');
}
