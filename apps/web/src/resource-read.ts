import { HttpError, responseError } from './api.js';

export const RESOURCE_READ_BUDGET = Object.freeze({
  attempts: 5,
  deadlineMs: 60000,
  busyDelaysMs: [250, 500, 1000, 2000] as readonly number[],
  pngBytes: 4 * 1024 * 1024,
});
function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}
/** Only BUSY is retried. One current read, five attempts total, one shared HTTP-sized deadline. */
export async function boundedResourceRead<T>(
  read: (signal: AbortSignal) => Promise<T>,
  parent: AbortSignal,
  onBusy: (attempt: number) => void = () => {},
) {
  const controller = new AbortController();
  const cancel = () => controller.abort(parent.reason);
  parent.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(
    () => controller.abort(new Error('读取超过60秒预算；上一成功预览保留，请检查本地服务后重读。')),
    RESOURCE_READ_BUDGET.deadlineMs,
  );
  try {
    if (parent.aborted) cancel();
    for (let attempt = 1; ; attempt++) {
      controller.signal.throwIfAborted();
      try {
        const value = await read(controller.signal);
        controller.signal.throwIfAborted();
        return value;
      } catch (error) {
        controller.signal.throwIfAborted();
        if (
          !(error instanceof HttpError && error.status === 429 && error.code === 'BUSY') ||
          attempt >= RESOURCE_READ_BUDGET.attempts
        )
          throw error;
        onBusy(attempt);
        await delay(RESOURCE_READ_BUDGET.busyDelaysMs[attempt - 1]!, controller.signal);
      }
    }
  } finally {
    clearTimeout(timer);
    parent.removeEventListener('abort', cancel);
  }
}
export async function processedPng(path: string, signal: AbortSignal) {
  const response = await fetch(path, { signal });
  if (!response.ok) throw responseError(response, await response.json());
  if (response.headers.get('content-type')?.split(';')[0] !== 'image/png')
    throw Error('处理预览响应不是PNG；上一成功预览保留。');
  const reader = response.body?.getReader();
  if (!reader) throw Error('处理预览没有图片数据。');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      signal.throwIfAborted();
      const next = await reader.read();
      if (next.done) break;
      length += next.value.length;
      if (length > RESOURCE_READ_BUDGET.pngBytes)
        throw Error('处理PNG超过4MiB预算；上一成功预览保留。');
      chunks.push(next.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte))
    throw Error('处理预览不是有效PNG；上一成功预览保留。');
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  signal.throwIfAborted();
  return {
    blob: new Blob([bytes], { type: 'image/png' }),
    sha256: [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join(''),
  };
}
