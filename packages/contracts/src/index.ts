import { z } from 'zod';
import type { OpenAPIObject } from 'openapi3-ts/oas30';
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);

export const WRITE_HEADER = 'x-tileset-client';
export const WRITE_HEADER_VALUE = 'local-v1';
export const ProjectIdSchema = z.string().uuid();
export const CreateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .refine(
        (s) => Array.from(s).every((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127),
        'Control characters are not allowed',
      ),
  })
  .strict();
export const ProjectSchema = z
  .object({
    id: ProjectIdSchema,
    name: z.string().min(1).max(80),
    createdAt: z.string().datetime(),
  })
  .strict();
export const ProjectListSchema = z.object({ projects: z.array(ProjectSchema).max(100) }).strict();
export const HealthSchema = z
  .object({ status: z.literal('ok'), database: z.literal('connected'), stage: z.literal('02') })
  .strict();
export const ErrorSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          'INVALID_REQUEST',
          'FORBIDDEN',
          'NOT_FOUND',
          'PAYLOAD_TOO_LARGE',
          'UNSUPPORTED_MEDIA_TYPE',
          'SERVICE_UNAVAILABLE',
          'INTERNAL_ERROR',
        ]),
        message: z.string().max(160),
      })
      .strict(),
  })
  .strict();
export type Project = z.infer<typeof ProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type ApiError = z.infer<typeof ErrorSchema>;

export function createOpenApiDocument(): OpenAPIObject {
  const registry = new OpenAPIRegistry();
  const project = registry.register('Project', ProjectSchema);
  const errors = Object.fromEntries(
    [400, 403, 404, 413, 415, 500, 503].map((status) => [
      status,
      {
        description: 'Safe error response',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    ]),
  );
  registry.registerPath({
    method: 'get',
    path: '/api/health',
    responses: {
      200: {
        description: 'Database connectivity',
        content: { 'application/json': { schema: HealthSchema } },
      },
      ...errors,
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/api/projects',
    responses: {
      200: {
        description: 'Latest 100 projects',
        content: { 'application/json': { schema: ProjectListSchema } },
      },
      ...errors,
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/api/projects/{id}',
    request: { params: z.object({ id: ProjectIdSchema }) },
    responses: {
      200: { description: 'Stored project', content: { 'application/json': { schema: project } } },
      ...errors,
    },
  });
  registry.registerPath({
    method: 'post',
    path: '/api/projects',
    description:
      'Requires an exact allowed Origin, JSON body and X-Tileset-Client: local-v1. No cookie authentication.',
    request: {
      headers: z.object({
        'x-tileset-client': z.literal(WRITE_HEADER_VALUE),
        origin: z.string().url(),
      }),
      body: { required: true, content: { 'application/json': { schema: CreateProjectSchema } } },
    },
    responses: {
      201: {
        description: 'Persisted project',
        content: { 'application/json': { schema: project } },
      },
      ...errors,
    },
  });
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: { title: 'AI Tileset Studio local API', version: '0.0.2' },
    servers: [{ url: '/' }],
  });
}
