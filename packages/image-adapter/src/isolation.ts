import { fork } from 'node:child_process';
import { AssetError, requireRule } from '@tileset/asset-core';
import { PNG_POLICY } from './png-policy.js';

export interface CodecRequest {
  readonly operation: 'decode' | 'encode' | 'runtime' | 'normalize-opaque-rgb';
  readonly bytes?: string;
  readonly width?: number;
  readonly height?: number;
}
export interface CodecResult {
  readonly bytes?: string;
  readonly width?: number;
  readonly height?: number;
  readonly versions: Record<string, string>;
  readonly rssBytes: number;
  readonly durationMs: number;
}
let active = false;
/** One process-wide slot, no retained queue. A killed native operation cannot block the parent. */
export async function runIsolated(
  request: CodecRequest,
  worker = new URL('../dist/codec-worker.js', import.meta.url),
  deadline: number = PNG_POLICY.decodeDeadlineMs,
  signal?: AbortSignal,
): Promise<CodecResult> {
  signal?.throwIfAborted();
  requireRule(!active, 'ADAPTER_BUSY', 'Image adapter concurrency budget is exhausted.');
  active = true;
  try {
    return await new Promise<CodecResult>((resolve, reject) => {
      const started = performance.now();
      let ready = false;
      const child = fork(worker, [], {
        execArgv: [`--max-old-space-size=${PNG_POLICY.childJsHeapMiB}`],
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        serialization: 'json',
      });
      let settled = false;
      const finish = (error?: AssetError, result?: CodecResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        child.kill('SIGKILL');
        // Release only after exit, so a timed-out native child never overlaps the next job.
        child.once('close', () => {
          if (error) reject(error);
          else if (result) resolve(result);
        });
      };
      const abort = () => finish(new AssetError('CODEC_CANCELLED', 'Image codec was cancelled.'));
      signal?.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(() => {
        const error = new AssetError(
          'CODEC_TIMEOUT',
          'Image codec exceeded its isolated deadline.',
        );
        error.cause = Object.freeze({
          phase: ready ? 'operation' : 'startup',
          operation: request.operation,
          elapsedMs: performance.now() - started,
        });
        finish(error);
      }, deadline);
      child.once('error', () =>
        finish(new AssetError('CODEC_FAILURE', 'Image codec process could not start.')),
      );
      child.once('exit', () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          signal?.removeEventListener('abort', abort);
          reject(new AssetError('CODEC_FAILURE', 'Image codec exited without a valid result.'));
        }
      });
      child.on('message', (message: unknown) => {
        if (
          message &&
          typeof message === 'object' &&
          'ready' in message &&
          message.ready === true
        ) {
          ready = true;
          return;
        }
        if (
          !message ||
          typeof message !== 'object' ||
          !('ok' in message) ||
          message.ok !== true ||
          !('result' in message)
        ) {
          const code =
            message &&
            typeof message === 'object' &&
            'code' in message &&
            [
              'HIDDEN_RGB',
              'RGBA_LENGTH',
              'PIXEL_LIMIT',
              'CODEC_FORMAT',
              'CODEC_DIMENSIONS',
            ].includes(String(message.code))
              ? String(message.code)
              : 'CODEC_FAILURE';
          finish(new AssetError(code, 'Image codec rejected the source.'));
        } else finish(undefined, message.result as CodecResult);
      });
      if (signal?.aborted) abort();
      child.send(request, (error) => {
        if (error) finish(new AssetError('CODEC_FAILURE', 'Image codec transport failed.'));
      });
    });
  } finally {
    active = false;
  }
}
