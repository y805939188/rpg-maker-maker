import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import { request as rawRequest, type Server } from 'node:http';
import { localRequestBoundary } from '../src/security.js';
import { parseConfig } from '../src/config.js';
import { safeError } from '../src/errors.js';
import { HttpException } from '@nestjs/common';
let server: Server;
let url: string;
function rawStatus(headers: Record<string, string>): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = rawRequest(url, { headers }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on('error', reject);
    req.end();
  });
}
beforeAll(async () => {
  const app = express();
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test address');
  url = `http://127.0.0.1:${address.port}`;
  app.use(
    localRequestBoundary(
      parseConfig({
        API_PORT: String(address.port),
        DATABASE_URL: 'postgresql://local@127.0.0.1:55432/tileset_test',
        NODE_ENV: 'test',
      }),
    ),
  );
  app.use((_req, res) => {
    res.json({ ok: true });
  });
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
describe('local Host/Origin/write boundary', () => {
  it('allows local GET and known browser JSON writes', async () => {
    expect((await fetch(url)).status).toBe(200);
    expect(
      (
        await fetch(url, {
          method: 'POST',
          headers: {
            Origin: url,
            'Content-Type': 'application/json',
            'X-Tileset-Client': 'local-v1',
          },
          body: '{}',
        })
      ).status,
    ).toBe(200);
  });
  it('blocks rebinding hosts, foreign/null origins, forwarded hosts and browser cross-site', async () => {
    for (const headers of [
      { Host: 'attacker.invalid' },
      { Origin: 'https://attacker.invalid' },
      { Origin: 'null' },
      { 'X-Forwarded-Host': '127.0.0.1' },
      { 'Sec-Fetch-Site': 'cross-site' },
    ])
      // Node fetch normalizes Host; raw HTTP proves the actual rebinding header reached the server.
      expect(await rawStatus(headers), JSON.stringify(headers)).toBe(403);
  });
  it('blocks simple form writes and missing Origin/custom header independently of CORS', async () => {
    expect(
      (
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Tileset-Client': 'local-v1' },
          body: '{}',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(url, {
          method: 'POST',
          headers: { Origin: url, 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(url, {
          method: 'POST',
          headers: {
            Origin: url,
            'X-Tileset-Client': 'local-v1',
            'Content-Type': 'multipart/form-data',
          },
          body: 'bytes',
        })
      ).status,
    ).toBe(415);
  });
  it('allows only explicit preflight headers and methods', async () => {
    const base = {
      Origin: url,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,x-tileset-client',
    };
    const allowed = await fetch(url, { method: 'OPTIONS', headers: base });
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('access-control-allow-origin')).toBe(url);
    expect(
      (
        await fetch(url, {
          method: 'OPTIONS',
          headers: { ...base, 'Access-Control-Request-Method': 'DELETE' },
        })
      ).status,
    ).toBe(403);
  });
});
describe('configuration and safe errors', () => {
  it('rejects external bind/database and malformed port without leaking the input', () => {
    for (const patch of [
      { API_HOST: '0.0.0.0' },
      { API_PORT: 'NaN' },
      { API_PORT: '5173' },
      { DATABASE_URL: 'postgresql://user:secret@remote.example/private' },
      { DATABASE_URL: 'postgresql://user:secret@127.0.0.1/postgres' },
    ])
      expect(() =>
        parseConfig({ DATABASE_URL: 'postgresql://local@127.0.0.1/tileset_test', ...patch }),
      ).toThrow('Invalid local server configuration.');
  });
  it('does not serialize exception messages, stack, SQL, paths or secrets', () => {
    expect(JSON.stringify(safeError(new Error('/private/password secret SELECT *')))).not.toMatch(
      /private|password|secret|SELECT/,
    );
    expect(safeError(new HttpException('secret', 404)).body.error.code).toBe('NOT_FOUND');
    expect(safeError({ type: 'entity.parse.failed', body: 'secret' }).status).toBe(400);
    expect(safeError({ type: 'entity.too.large', body: 'secret' }).status).toBe(413);
  });
});
