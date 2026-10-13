import { afterEach, expect, it, vi } from 'vitest';
import { pollAfterCompletion } from '../src/poll.js';
import { boundedResourceRead } from '../src/resource-read.js';
import { HttpError } from '../src/api.js';

afterEach(() => vi.useRealTimers());
it('a synchronously disposed effect sends no request or obsolete native work', async () => {
  let calls = 0;
  const controller = new AbortController();
  const result = boundedResourceRead(async () => {
    calls++;
    return 'obsolete';
  }, controller.signal).catch((e: unknown) => e);
  controller.abort(Error('disposed setup'));
  expect(((await result) as Error).message).toBe('disposed setup');
  expect(calls).toBe(0);
});
it('1300ms reads never overlap an 800ms poll and stop scheduling after cancellation', async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  let active = 0,
    maximum = 0,
    completed = 0;
  const stop = pollAfterCompletion(async () => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 1300));
    active--;
    completed++;
  }, controller.signal);
  await vi.advanceTimersByTimeAsync(8000);
  expect(maximum).toBe(1);
  expect(completed).toBe(3);
  controller.abort();
  stop();
  await vi.advanceTimersByTimeAsync(10000);
  expect(completed).toBe(4);
  expect(active).toBe(0);
});
it('a reported failed read can settle before the next poll; it cannot launch an unlimited interval', async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const errors: string[] = [];
  let calls = 0;
  const stop = pollAfterCompletion(
    async () => {
      calls++;
      throw Error('offline');
    },
    controller.signal,
    800,
    { onError: ({ error }) => errors.push(String(error)) },
  );
  await vi.advanceTimersByTimeAsync(2400);
  controller.abort();
  stop();
  expect(calls).toBe(3);
  expect(errors).toHaveLength(3);
  await vi.advanceTimersByTimeAsync(10000);
  expect(calls).toBe(3);
});
it('five consecutive failed polls stop automatically and start no later request', async () => {
  vi.useFakeTimers();
  let calls = 0;
  const stopped = vi.fn();
  pollAfterCompletion(
    async () => {
      calls++;
      throw new HttpError('unavailable', 503, 'SERVICE_UNAVAILABLE');
    },
    new AbortController().signal,
    800,
    { onStopped: stopped },
  );
  await vi.advanceTimersByTimeAsync(80000);
  expect(calls).toBe(5);
  expect(stopped).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ failures: 5, elapsedMs: 3200 }),
  );
});
it('successful polls reset the error episode and legal long work can exceed five reads', async () => {
  vi.useFakeTimers();
  let calls = 0;
  const stopped = vi.fn(),
    recovered = vi.fn(),
    controller = new AbortController();
  const stop = pollAfterCompletion(
    async () => {
      calls++;
      if (calls < 5 || (calls > 5 && calls < 10)) throw Error('temporary network failure');
    },
    controller.signal,
    800,
    { onStopped: stopped, onRecovered: recovered },
  );
  await vi.advanceTimersByTimeAsync(16000);
  expect(calls).toBe(20);
  expect(recovered).toHaveBeenCalledTimes(2);
  expect(stopped).not.toHaveBeenCalled();
  controller.abort();
  stop();
});
it('one consecutive-error deadline aborts the active retry, without resetting its 60s window', async () => {
  vi.useFakeTimers();
  let calls = 0;
  const stopped = vi.fn();
  pollAfterCompletion(
    async (signal) => {
      calls++;
      if (calls === 1) {
        await new Promise((resolve) => setTimeout(resolve, 45000));
        throw Error('slow failed read');
      }
      await new Promise((_, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
      );
    },
    new AbortController().signal,
    800,
    { onStopped: stopped },
  );
  await vi.advanceTimersByTimeAsync(80000);
  expect(calls).toBe(2);
  expect(stopped).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ failures: 1, elapsedMs: 60000 }),
  );
});
it('recovers a BUSY read after bounded waits without overlapping or retrying a success', async () => {
  vi.useFakeTimers();
  let calls = 0;
  const busy: number[] = [];
  const promise = boundedResourceRead(
    async () => {
      calls++;
      if (calls < 3) throw new HttpError('busy', 429, 'BUSY');
      return 'actual PNG';
    },
    new AbortController().signal,
    (n) => busy.push(n),
  );
  await vi.advanceTimersByTimeAsync(750);
  expect(await promise).toBe('actual PNG');
  expect(calls).toBe(3);
  expect(busy).toEqual([1, 2]);
});
it('persistent BUSY ends after exactly five attempts, preserving the failure for explicit user recovery', async () => {
  vi.useFakeTimers();
  let calls = 0;
  const result = boundedResourceRead(async () => {
    calls++;
    throw new HttpError('busy', 429, 'BUSY');
  }, new AbortController().signal).catch((e: unknown) => e);
  await vi.advanceTimersByTimeAsync(60000);
  expect(await result).toBeInstanceOf(HttpError);
  expect(calls).toBe(5);
});
it('cancelling a retry wait starts no late read', async () => {
  vi.useFakeTimers();
  let calls = 0;
  const controller = new AbortController();
  const result = boundedResourceRead(async () => {
    calls++;
    throw new HttpError('busy', 429, 'BUSY');
  }, controller.signal).catch((e: unknown) => e);
  await vi.advanceTimersByTimeAsync(100);
  controller.abort(Error('old project'));
  await vi.advanceTimersByTimeAsync(60000);
  expect(((await result) as Error).message).toBe('old project');
  expect(calls).toBe(1);
});
it('one 60s deadline aborts the active operation and is never an automatic retry', async () => {
  vi.useFakeTimers();
  let calls = 0;
  const result = boundedResourceRead((signal) => {
    calls++;
    return new Promise((_, reject) =>
      signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
    );
  }, new AbortController().signal).catch((e: unknown) => e);
  await vi.advanceTimersByTimeAsync(60000);
  expect(((await result) as Error).message).toContain('60秒');
  expect(calls).toBe(1);
});
it.each([
  new HttpError('invalid PNG', 422, 'VALIDATION_FAILED'),
  new HttpError('missing', 404, 'NOT_FOUND'),
  Error('network stopped'),
])('does not retry non-BUSY failures (%s)', async (failure) => {
  let calls = 0;
  await expect(
    boundedResourceRead(async () => {
      calls++;
      throw failure;
    }, new AbortController().signal),
  ).rejects.toBe(failure);
  expect(calls).toBe(1);
});
