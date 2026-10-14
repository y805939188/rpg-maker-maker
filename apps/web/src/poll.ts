export const POLL_ERROR_BUDGET = Object.freeze({ failures: 5, deadlineMs: 60000 });
export type PollFailure = { error: unknown; failures: number; elapsedMs: number };
/** Successful polls can continue; only consecutive errors share this recovery budget. */
export function pollAfterCompletion(
  read: (signal: AbortSignal) => Promise<void>,
  signal: AbortSignal,
  intervalMs = 800,
  callbacks: {
    onError?: (failure: PollFailure) => void;
    onRecovered?: () => void;
    onStopped?: (failure: PollFailure) => void;
  } = {},
) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined,
    deadline: ReturnType<typeof setTimeout> | undefined,
    stopped = false,
    failures = 0,
    started: number | undefined,
    lastError: unknown;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    clearTimeout(deadline);
    controller.abort(signal.reason);
    signal.removeEventListener('abort', stop);
  };
  const exhausted = () => {
    if (stopped) return;
    const failure = { error: lastError, failures, elapsedMs: performance.now() - started! };
    stop();
    callbacks.onStopped?.(failure);
  };
  const run = async () => {
    const attemptStarted = performance.now();
    try {
      await read(controller.signal);
      if (stopped) return;
      if (failures) callbacks.onRecovered?.();
      failures = 0;
      started = undefined;
      clearTimeout(deadline);
      deadline = undefined;
    } catch (error) {
      if (stopped) return;
      lastError = error;
      started ??= attemptStarted;
      failures++;
      const elapsedMs = performance.now() - started;
      callbacks.onError?.({ error, failures, elapsedMs });
      if (failures >= POLL_ERROR_BUDGET.failures || elapsedMs >= POLL_ERROR_BUDGET.deadlineMs) {
        exhausted();
        return;
      }
      deadline ??= setTimeout(exhausted, POLL_ERROR_BUDGET.deadlineMs - elapsedMs);
    }
    schedule();
  };
  const schedule = () => {
    if (stopped || signal.aborted) return;
    timer = setTimeout(() => void run(), intervalMs);
  };
  signal.addEventListener('abort', stop, { once: true });
  if (signal.aborted) stop();
  else schedule();
  return stop;
}
