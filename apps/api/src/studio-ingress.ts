import type { Request, Response } from 'express';
import { StudioError } from './studio-errors.js';
export const HTTP_IMAGE_BUDGET = Object.freeze({
  bytes: 4 * 1024 * 1024,
  chunks: 4096,
  readMs: 5000,
  operationMs: 60000,
  concurrency: 1,
});
export function requestLifetime(req: Request, res: Response, ms = HTTP_IMAGE_BUDGET.operationMs) {
  const controller = new AbortController();
  const cancel = () =>
    controller.abort(
      new StudioError(
        {
          code: 'CANCELLED',
          message: '请求已取消。',
          recovery: '重新上传或读取素材。',
          location: '请求',
        },
        408,
      ),
    );
  const closed = () => {
    if (!res.writableEnded) cancel();
  };
  req.once('aborted', cancel);
  res.once('close', closed);
  const timer = setTimeout(
    () =>
      controller.abort(
        new StudioError(
          {
            code: 'TIMEOUT',
            message: '请求处理超过时间预算。',
            recovery: '检查本地服务后重新操作；上一成功结果保留。',
            location: '请求',
          },
          408,
        ),
      ),
    ms,
  );
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
      req.off('aborted', cancel);
      res.off('close', closed);
    },
  };
}
/** No multipart/temp-file middleware: rejected or partial incoming bytes never become asset files. */
export async function readHttpPng(req: Request, signal: AbortSignal) {
  if (req.headers['content-encoding'])
    throw new StudioError(
      {
        code: 'ENCODING',
        message: '上传不接受压缩 HTTP body。',
        location: '上传',
        recovery: '直接上传 PNG 文件。',
      },
      415,
    );
  const declared = req.headers['content-length'];
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > HTTP_IMAGE_BUDGET.bytes))
    throw new StudioError(
      {
        code: 'ENCODED_LIMIT',
        message: 'PNG 超过 4 MiB 上传上限。',
        location: '上传',
        recovery: '使用符合限制的 PNG。',
      },
      413,
    );
  return new Promise<Uint8Array>((accept, reject) => {
    let total = 0;
    const chunks: Uint8Array[] = [];
    const end = (error?: unknown) => {
      clearTimeout(timer);
      req.off('data', data);
      req.off('end', done);
      req.off('error', broken);
      signal.removeEventListener('abort', abort);
      if (error) {
        req.pause();
        reject(error);
      } else {
        const bytes = new Uint8Array(total);
        let at = 0;
        for (const c of chunks) {
          bytes.set(c, at);
          at += c.length;
        }
        accept(bytes);
      }
    };
    const abort = () => end(signal.reason);
    const broken = () => end(new Error('Cancelled request'));
    const data = (chunk: Buffer) => {
      if (
        total + chunk.length > HTTP_IMAGE_BUDGET.bytes ||
        chunks.length >= HTTP_IMAGE_BUDGET.chunks
      ) {
        end(
          new StudioError(
            {
              code: 'ENCODED_LIMIT',
              message: 'PNG 上传超出字节或数据块预算。',
              location: '上传',
              recovery: '使用不超过 4 MiB 的合格 PNG。',
            },
            413,
          ),
        );
        return;
      }
      total += chunk.length;
      chunks.push(new Uint8Array(chunk));
    };
    const done = () => end();
    const timer = setTimeout(
      () =>
        end(
          new StudioError(
            {
              code: 'READ_TIMEOUT',
              message: 'PNG 读取超过 5 秒。',
              location: '上传',
              recovery: '连接已停止；重新上传完整 PNG。',
            },
            408,
          ),
        ),
      HTTP_IMAGE_BUDGET.readMs,
    );
    signal.addEventListener('abort', abort, { once: true });
    req.on('data', data);
    req.once('end', done);
    req.once('error', broken);
    if (signal.aborted) abort();
  });
}
