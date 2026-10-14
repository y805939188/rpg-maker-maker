import type { RequestHandler } from 'express';
import { WRITE_HEADER, WRITE_HEADER_VALUE, type ApiError } from '@tileset/contracts';
import type { ServerConfig } from './config.js';

export function localRequestBoundary(config: ServerConfig): RequestHandler {
  const hosts = new Set([`127.0.0.1:${config.API_PORT}`]);
  const origins = new Set([
    `http://127.0.0.1:${config.API_PORT}`,
    ...(config.NODE_ENV === 'production' ? [] : [`http://127.0.0.1:${config.WEB_PORT}`]),
  ]);
  return (req, res, next) => {
    const deny = (status: number, code: ApiError['error']['code'], message: string) =>
      res.status(status).json({ error: { code, message } } satisfies ApiError);
    if (
      !hosts.has(req.headers.host ?? '') ||
      req.headers['x-forwarded-host'] ||
      req.headers['x-forwarded-for']
    ) {
      deny(403, 'FORBIDDEN', 'Local request host is not allowed.');
      return;
    }
    const origin = req.headers.origin;
    if (
      (origin !== undefined && !origins.has(origin)) ||
      req.headers['sec-fetch-site'] === 'cross-site'
    ) {
      deny(403, 'FORBIDDEN', 'Request origin is not allowed.');
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      if (
        !origin ||
        !['POST', 'GET'].includes(req.headers['access-control-request-method'] ?? '') ||
        (req.headers['access-control-request-headers'] ?? '')
          .split(',')
          .some((h) => h.trim() && !['content-type', WRITE_HEADER].includes(h.trim().toLowerCase()))
      ) {
        deny(403, 'FORBIDDEN', 'Preflight request is not allowed.');
        return;
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
      res.setHeader('Access-Control-Allow-Headers', `Content-Type, ${WRITE_HEADER}`);
      res.status(204).end();
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (!origin || req.headers[WRITE_HEADER] !== WRITE_HEADER_VALUE) {
        deny(403, 'FORBIDDEN', 'Write requests require the local client boundary.');
        return;
      }
      const upload =
        /^\/api\/projects\/[a-f0-9-]{36}\/sources\/(grass|water-[012]|mask|overlay)\/upload$/.test(
          req.path,
        );
      if (upload && (req.method !== 'POST' || req.headers['content-type'] !== 'image/png')) {
        deny(415, 'UNSUPPORTED_MEDIA_TYPE', 'PNG upload requires image/png.');
        return;
      }
      if (
        !upload &&
        !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] ?? '')
      ) {
        deny(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JSON requests are supported.');
        return;
      }
    }
    next();
  };
}
