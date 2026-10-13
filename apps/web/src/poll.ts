/** One in-flight poll; the next delay starts after the prior request settles. */
export function pollAfterCompletion(
  read: () => Promise<void>,
  signal: AbortSignal,
  intervalMs = 800,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => clearTimeout(timer);
  const schedule = () => {
    if (signal.aborted) return;
    timer = setTimeout(() => {
      void read().finally(schedule);
    }, intervalMs);
  };
  signal.addEventListener('abort', stop, { once: true });
  schedule();
  return () => {
    stop();
    signal.removeEventListener('abort', stop);
  };
}
