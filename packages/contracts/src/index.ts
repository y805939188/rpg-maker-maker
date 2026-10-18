import * as aiStudio from './ai-studio.js';
import * as studio from './studio.js';
export * from './studio.js';
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
          'BUSY',
          'TIMEOUT',
          'CONFLICT',
          'VALIDATION_FAILED',
          'FORBIDDEN',
          'NOT_FOUND',
          'PAYLOAD_TOO_LARGE',
          'UNSUPPORTED_MEDIA_TYPE',
          'SERVICE_UNAVAILABLE',
          'INTERNAL_ERROR',
        ]),
        message: z.string().max(240),
        diagnostic: z
          .object({
            code: z.string().max(80),
            message: z.string().max(240),
            recovery: z.string().max(240),
            location: z.string().max(100),
          })
          .strict()
          .optional(),
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
    [400, 403, 404, 408, 409, 413, 415, 422, 429, 500, 503].map((status) => [
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

  const params = z.object({ id: ProjectIdSchema });
  const writeHeaders = z.object({
    'x-tileset-client': z.literal(WRITE_HEADER_VALUE),
    origin: z.string().url(),
  });
  const jsonRoutes = [
    ['get', '/api/projects/{id}/studio', undefined, studio.StudioSchema, 200],
    ['get', '/api/projects/{id}/ai', undefined, aiStudio.AiStateSchema, 200],
    [
      'post',
      '/api/projects/{id}/ai/create',
      aiStudio.AiCreateSchema,
      aiStudio.AiCreatedSchema,
      202,
    ],
    ['post', '/api/projects/{id}/ai/apply', aiStudio.AiApplySchema, aiStudio.AiAppliedSchema, 202],
    ['post', '/api/projects/{id}/ai/action', aiStudio.AiTaskActionSchema, studio.SavedSchema, 200],
    [
      'post',
      '/api/projects/{id}/builds/{build}/export',
      studio.EmptyQuerySchema,
      studio.SavedSchema,
      200,
    ],
    ['post', '/api/projects/{id}/preset', studio.PresetRequestSchema, studio.SavedSchema, 201],
    ['post', '/api/projects/{id}/recipe', studio.RecipeRequestSchema, studio.SavedSchema, 201],
    ['post', '/api/projects/{id}/builds', studio.BuildRequestSchema, studio.JobSchema, 202],
    ['get', '/api/projects/{id}/builds/{build}/preview', undefined, studio.BuildDetailSchema, 200],
    [
      'post',
      '/api/projects/{id}/builds/{build}/visual',
      studio.ConfirmationSchema,
      studio.SavedSchema,
      200,
    ],
  ] as const;
  for (const [method, path, input, output, status] of jsonRoutes)
    registry.registerPath({
      method,
      path,
      description: 'Studio local-first route. JSON body ≤8 KiB; no server paths or external URLs.',
      request: {
        params: path.includes('{build}') ? params.extend({ build: studio.HashSchema }) : params,
        ...(method === 'post'
          ? {
              headers: writeHeaders,
              body: { required: true, content: { 'application/json': { schema: input! } } },
            }
          : {}),
        query:
          method === 'get' && path.endsWith('/preview')
            ? studio.PreviewQuerySchema
            : studio.EmptyQuerySchema,
      },
      responses: {
        [status]: {
          description: 'Validated Studio response',
          content: { 'application/json': { schema: output } },
        },
        ...errors,
      },
    });
  registry.registerPath({
    method: 'post',
    path: '/api/projects/{id}/sources/{component}/upload',
    description:
      'Raw single RGBA8 sRGB PNG. ≤4 MiB, 5s read, 5s isolated codec, one processing slot/no queue; exact Origin/custom header required. Not the JSON budget.',
    request: {
      params: params.extend({ component: studio.ComponentSchema }),
      headers: writeHeaders,
      query: studio.UploadQuerySchema,
      body: {
        required: true,
        content: {
          'image/png': { schema: z.string().openapi({ type: 'string', format: 'binary' }) },
        },
      },
    },
    responses: {
      201: {
        description: 'Owned source revision',
        content: { 'application/json': { schema: studio.UploadResultSchema } },
      },
      ...errors,
    },
  });
  registry.registerPath({
    method: 'post',
    path: '/api/projects/{id}/ai/reference/upload',
    description:
      'Bounded PNG reference bytes; no paths or URLs. Original retained. Preparation is explicit and lossy.',
    request: {
      params,
      headers: writeHeaders,
      query: studio.EmptyQuerySchema,
      body: {
        required: true,
        content: {
          'image/png': { schema: z.string().openapi({ type: 'string', format: 'binary' }) },
        },
      },
    },
    responses: {
      201: {
        description: 'Immutable reference',
        content: { 'application/json': { schema: aiStudio.AiReferenceSchema } },
      },
      ...errors,
    },
  });
  for (const [path, extra, query, media] of [
    [
      '/api/projects/{id}/sources/{source}/png',
      { source: studio.HashSchema },
      studio.EmptyQuerySchema,
      'image/png',
    ],
    [
      '/api/projects/{id}/recipes/{recipe}/processed',
      { recipe: studio.HashSchema },
      studio.ProcessedQuerySchema,
      'image/png',
    ],
    [
      '/api/projects/{id}/builds/{build}/files/{name}',
      { build: studio.HashSchema, name: studio.ExportFileNameSchema },
      studio.EmptyQuerySchema,
      'application/octet-stream',
    ],
    [
      '/api/projects/{id}/builds/{build}/profile',
      { build: studio.HashSchema },
      studio.EmptyQuerySchema,
      'application/json',
    ],
    [
      '/api/projects/{id}/builds/{build}/download',
      { build: studio.HashSchema },
      studio.EmptyQuerySchema,
      'application/zip',
    ],
  ] as const)
    registry.registerPath({
      method: 'get',
      path,
      request: { params: params.extend(extra), query },
      responses: {
        200: {
          description:
            'Hash-verified resource belonging to this project and exact build. Full TargetProfile is also embedded in the standard export Manifest.',
          content: {
            [media]: { schema: z.string().openapi({ type: 'string', format: 'binary' }) },
          },
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

export * from './ai-studio.js';
