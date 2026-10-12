import { describe, expect, it } from 'vitest';
import { CreateProjectSchema, ProjectSchema, createOpenApiDocument } from '../src/index.js';
describe('JSON HTTP boundary and OpenAPI', () => {
  it('rejects untrusted entity/path fields and malformed project input', () => {
    expect(CreateProjectSchema.parse({ name: '  湖畔  ' })).toEqual({ name: '湖畔' });
    for (const body of [
      { name: '' },
      { name: 'x'.repeat(81) },
      { name: 'lake\u0000' },
      { name: 'lake', localPath: '/tmp/private' },
      { name: 'lake', model: 'paid' },
    ])
      expect(CreateProjectSchema.safeParse(body).success).toBe(false);
    expect(
      ProjectSchema.safeParse({ id: 'not-an-id', name: 'x', createdAt: new Date() }).success,
    ).toBe(false);
  });
  it('generates the documented routes from actual Zod schemas', () => {
    const document = createOpenApiDocument();
    expect(document.openapi).toBe('3.0.3');
    expect(Object.keys(document.paths)).toEqual([
      '/api/health',
      '/api/projects',
      '/api/projects/{id}',
    ]);
    expect(document.paths['/api/projects']?.post?.responses['201']).toBeDefined();
    expect(JSON.stringify(document)).not.toMatch(/DATABASE_URL|localPath|predictionId|apiKey/);
  });
});
