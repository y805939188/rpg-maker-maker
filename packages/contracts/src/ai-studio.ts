import { z } from 'zod';
import { HashSchema, RecipeRequestSchema, JobSchema } from './studio.js';
export const AiCreateSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    supplemental: z.string().trim().max(600).default(''),
    style: z.enum(['temperate-pixel', 'muted-pixel']).default('temperate-pixel'),
    referenceId: HashSchema.optional(),
    repair: z.enum(['grass', 'water']).optional(),
  })
  .strict();
export const AiApplySchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    grassTask: z.string().uuid().optional(),
    waterTask: z.string().uuid().optional(),
  })
  .strict()
  .refine((v) => v.grassTask || v.waterTask);
export const AiTaskActionSchema = z
  .object({ taskId: z.string().uuid(), action: z.enum(['resume', 'cancel', 'discard']) })
  .strict();
export const AiCandidateSchema = z
  .object({
    id: z.string().uuid(),
    component: z.enum(['grass', 'water']),
    batch: z.string().uuid(),
    mode: z.enum(['text', 'reference']),
    purpose: z.enum(['initial', 'retry', 'repair']),
    state: z.string(),
    archiveState: z.string(),
    errorCode: z.string().nullable(),
    createdAt: z.string().datetime(),
    sha256: HashSchema.nullable(),
    sourceId: HashSchema.nullable(),
    url: z.string().nullable(),
    recovery: z.string(),
    discarded: z.boolean(),
  })
  .strict();
export const AiStateSchema = z
  .object({
    mode: z.enum(['mock', 'wavespeed', 'disabled']),
    candidates: z.array(AiCandidateSchema),
    limits: z.string(),
  })
  .strict();
export const AiCreatedSchema = z
  .object({ taskIds: z.array(z.string().uuid()).min(1).max(2) })
  .strict();
export const AiAppliedSchema = z
  .object({ job: JobSchema, sources: RecipeRequestSchema.shape.sources })
  .strict();
export const AiReferenceSchema = z
  .object({
    id: HashSchema,
    sha256: HashSchema,
    width: z.number().int(),
    height: z.number().int(),
    preparation: z.literal('center-crop-square-nearest-v2'),
  })
  .strict();
export type AiState = z.infer<typeof AiStateSchema>;
