import { z } from 'zod';
export const HashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const ComponentSchema = z.enum([
  'grass',
  'water-0',
  'water-1',
  'water-2',
  'mask',
  'overlay',
]);
export const UploadQuerySchema = z.object({ density: z.enum(['1', '2']) }).strict();
export const SourceChoiceSchema = z
  .object({
    id: HashSchema,
    component: ComponentSchema,
    revision: z.number().int().positive(),
    density: z.number().int(),
    sha256: HashSchema,
    width: z.number().int(),
    height: z.number().int(),
    url: z.string(),
    role: z.string(),
  })
  .strict();
export const RecipeRequestSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    sources: z
      .object({
        grass: HashSchema,
        'water-0': HashSchema,
        'water-1': HashSchema,
        'water-2': HashSchema,
        mask: HashSchema,
        overlay: HashSchema,
      })
      .strict(),
    style: z.enum(['component-palette', 'baseline-palette']),
  })
  .strict();
export const PresetRequestSchema = z.object({ family: z.enum(['art', 'diagnostic']) }).strict();
export const BuildRequestSchema = z
  .object({
    recipeId: HashSchema,
    expectedRevision: z.number().int().nonnegative(),
    mode: z.enum(['update', 'retire-and-add']),
  })
  .strict();
export const DiagnosticSchema = z
  .object({
    code: z.string().max(80),
    message: z.string().max(240),
    recovery: z.string().max(240),
    location: z.string().max(100),
  })
  .strict();
export const JobSchema = z
  .object({
    id: z.string().uuid(),
    state: z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED']),
    buildId: HashSchema.nullable(),
    diagnostic: DiagnosticSchema.nullable(),
    createdAt: z.string().datetime(),
  })
  .strict();
export const BuildSummarySchema = z
  .object({
    id: HashSchema,
    version: z.number().int(),
    projectRevision: z.number().int(),
    publication: z.enum(['ADOPTED', 'HISTORICAL']),
    current: z.boolean(),
    exportBuildId: z.string().nullable(),
    createdAt: z.string().datetime(),
  })
  .strict();
export const RecipeSummarySchema = z
  .object({
    id: HashSchema,
    revision: z.number().int(),
    current: z.boolean(),
    irHash: HashSchema,
    components: z.record(HashSchema),
    style: z.string(),
  })
  .strict();
export const StudioSchema = z
  .object({
    projectId: z.string().uuid(),
    animation: z
      .object({ sequence: z.array(z.number().int()), updatesPerState: z.number().int().positive() })
      .strict(),
    revision: z.number().int(),
    successfulBuildId: HashSchema.nullable(),
    needsRebuild: z.boolean(),
    sources: z.array(SourceChoiceSchema),
    recipes: z.array(RecipeSummarySchema),
    builds: z.array(BuildSummarySchema),
    jobs: z.array(JobSchema),
    mockTasks: z.array(
      z
        .object({
          id: z.string().uuid(),
          state: z.string(),
          archiveState: z.string(),
          recovery: z.string(),
        })
        .strict(),
    ),
  })
  .strict();
export const SceneSchema = z.enum(['isolated', 'edges', 'holes', 'channel', 'pond', 'large']);
const RectSchema = z
  .object({
    sx: z.number().int().nonnegative(),
    sy: z.number().int().nonnegative(),
    dx: z.number().int().nonnegative(),
    dy: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();
export const RenderDescriptorSchema = z
  .object({
    buildId: HashSchema,
    scene: SceneSchema,
    group: z.string(),
    exportBuildId: z.string(),
    manifestSha: HashSchema,
    profileHash: HashSchema,
    compiler: z.string(),
    width: z.number().int(),
    height: z.number().int(),
    tileSize: z.number().int(),
    sequence: z.array(z.number().int()),
    updatesPerState: z.number().int(),
    logicalHz: z.literal(60),
    states: z
      .array(
        z.array(
          z
            .object({
              atlas: z.enum(['A1', 'A2']),
              shape: z.number().int(),
              tileId: z.number().int(),
              rects: z.array(RectSchema).length(4),
            })
            .strict(),
        ),
      )
      .length(4),
    png: z.object({ A1: z.string(), A2: z.string() }).strict(),
    manifestUrl: z.string(),
    profileUrl: z.string(),
    groups: z.array(
      z.object({ logicalId: z.string(), state: z.enum(['ACTIVE', 'RETIRED']) }).strict(),
    ),
  })
  .strict();
export const QaSchema = z
  .object({
    structural: z.literal('STRUCTURAL_PASS'),
    profileBaseline: z.literal('PROFILE_VERIFIED_STAGE_BASELINE'),
    artifactMz: z.literal('NOT_EXECUTED'),
    visual: z.enum(['NOT_EXECUTED', 'USER_CONFIRMED', 'USER_REJECTED']),
    risks: z.array(
      z
        .object({
          code: z.string(),
          location: z.string(),
          metric: z.number(),
          threshold: z.number(),
          message: z.string(),
        })
        .strict(),
    ),
    limits: z.string(),
  })
  .strict();
export const BuildDetailSchema = z
  .object({ descriptor: RenderDescriptorSchema, qa: QaSchema })
  .strict();
export const ConfirmationSchema = z.object({ confirmed: z.boolean() }).strict();
export type Studio = z.infer<typeof StudioSchema>;
export type RenderDescriptor = z.infer<typeof RenderDescriptorSchema>;
export type BuildDetail = z.infer<typeof BuildDetailSchema>;
export type Diagnostic = z.infer<typeof DiagnosticSchema>;
export type SourceChoice = z.infer<typeof SourceChoiceSchema>;

export const EmptyQuerySchema = z.object({}).strict();
export const ProcessedQuerySchema = z.object({ frame: z.enum(['ground', '0', '1', '2']) }).strict();
export const PreviewQuerySchema = z
  .object({
    scene: SceneSchema,
    group: z
      .string()
      .regex(/^[a-z][a-z0-9-]{0,63}$/)
      .optional(),
  })
  .strict();
export const ExportFileNameSchema = z.enum([
  'A1.png',
  'A2.png',
  'manifest.json',
  'pack.json',
  'history.json',
  'layout.json',
  'sources.json',
  'INSTALL.md',
]);
export const SavedSchema = z.object({ saved: z.literal(true) }).strict();
export const UploadResultSchema = z
  .object({
    id: HashSchema,
    measurement: z
      .object({
        rssBytes: z.number().int().nonnegative(),
        durationMs: z.number().nonnegative(),
        versions: z.record(z.string()),
      })
      .strict(),
  })
  .strict();
