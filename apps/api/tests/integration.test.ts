import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createApplication } from '../src/app.js';
import { loadEnvironment, parseConfig } from '../src/config.js';
import { ProjectSchema, ProjectListSchema, ErrorSchema } from '@tileset/contracts';

let running: Awaited<ReturnType<typeof createApplication>>;
let url: string;
const created: string[] = [];
beforeAll(async () => {
  loadEnvironment();
  const config = parseConfig({
    ...process.env,
    API_PORT: process.env['INTEGRATION_API_PORT'] ?? '4311',
    NODE_ENV: 'test',
  });
  running = await createApplication(config);
  await running.app.listen(config.API_PORT, '127.0.0.1');
  url = `http://127.0.0.1:${config.API_PORT}`;
});
afterAll(async () => {
  if (running) {
    await running.db.project.deleteMany({ where: { id: { in: created } } });
    await running.close();
  }
});
function write(body: string, headers: Record<string, string> = {}) {
  return fetch(url + '/api/projects', {
    method: 'POST',
    headers: {
      Origin: url,
      'Content-Type': 'application/json',
      'X-Tileset-Client': 'local-v1',
      ...headers,
    },
    body,
  });
}
describe('real PostgreSQL / Nest / shared contract', () => {
  it('writes and reads the identical row through HTTP and Prisma', async () => {
    const name = 'integration-' + randomUUID();
    const response = await write(JSON.stringify({ name }));
    expect(response.status).toBe(201);
    const project = ProjectSchema.parse(await response.json());
    created.push(project.id);
    expect((await running.db.project.findUniqueOrThrow({ where: { id: project.id } })).name).toBe(
      name,
    );
    expect(
      ProjectSchema.parse(await (await fetch(url + '/api/projects/' + project.id)).json()),
    ).toEqual(project);
    expect(
      ProjectListSchema.parse(await (await fetch(url + '/api/projects')).json()).projects,
    ).toContainEqual(project);
  });
  it('rejects malformed JSON, oversize, extra fields, CSRF and wrong media without adding rows', async () => {
    const before = await running.db.project.count();
    for (const [body, status] of [
      ['{', 400],
      [JSON.stringify({ name: 'x'.repeat(9000) }), 413],
      [JSON.stringify({ name: 'x', localPath: '/tmp' }), 400],
    ] as const) {
      const result = await write(body);
      expect(result.status).toBe(status);
      ErrorSchema.parse(await result.json());
    }
    expect((await write('{"name":"bad"}', { Origin: 'https://external.example' })).status).toBe(
      403,
    );
    expect((await write('payload', { 'Content-Type': 'image/png' })).status).toBe(415);
    expect(await running.db.project.count()).toBe(before);
  });
  it('returns safe not-found and database health, with OpenAPI JSON available', async () => {
    expect((await fetch(url + '/api/health')).status).toBe(200);
    const missing = await fetch(url + '/api/projects/' + randomUUID());
    expect(missing.status).toBe(404);
    ErrorSchema.parse(await missing.json());
    expect((await fetch(url + '/api/projects/not-uuid')).status).toBe(400);
    const spec = (await (await fetch(url + '/api/openapi.json')).json()) as { openapi: string };
    expect(spec.openapi).toBe('3.0.3');
  });
});
