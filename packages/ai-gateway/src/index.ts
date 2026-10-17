import { z } from 'zod';

export type JsonValue =
  null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
const json: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.null(), z.boolean(), z.number().finite(), z.string(), z.array(json), z.record(json)]),
);
const version = z.string().min(1).max(120);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const TaskStateSchema = z.enum([
  'CREATED',
  'QUEUED',
  'SUBMITTING',
  'SUBMISSION_UNKNOWN',
  'REMOTE_RUNNING',
  'FETCHING_RESULT',
  'VALIDATING_AND_INGESTING',
  'COMPLETED',
  'FAILED',
  'CANCEL_REQUESTED',
  'CANCELLED_LOCAL',
]);
export type TaskState = z.infer<typeof TaskStateSchema>;

// Snapshot boundary: no credentials, network call or task runner.
export const TaskSnapshotSchema = z
  .object({
    contractVersion: z.literal('task-snapshot-v1'),
    configurationVersion: version,
    taskKind: z.enum(['IMAGE_GENERATE', 'IMAGE_EDIT']),
    model: z
      .object({
        provider: z.enum(['mock', 'wavespeed']),
        modelId: version,
        modelVersion: version,
        adapterVersion: version,
        parameters: z.record(json),
      })
      .strict(),
    prompts: z
      .object({
        main: z
          .object({ id: version, revision: version, content: z.string().min(1).max(32000) })
          .strict(),
        task: z
          .object({ id: version, revision: version, content: z.string().min(1).max(32000) })
          .strict(),
        supplemental: z.string().max(4000),
      })
      .strict(),
    targetProfile: z.object({ id: version, version }).strict(),
    style: z.object({ id: version, revision: version, parameters: z.record(json) }).strict(),
    structuredParameters: z.record(json),
    references: z
      .array(z.object({ assetId: z.string().uuid(), revision: version, sha256: hash }).strict())
      .max(8),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.taskKind === 'IMAGE_EDIT' && value.references.length === 0)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['references'],
        message: 'Editing requires an immutable reference revision',
      });
  });
type ParsedSnapshot = z.infer<typeof TaskSnapshotSchema>;
export type TaskSnapshot = Readonly<
  Omit<
    ParsedSnapshot,
    'model' | 'prompts' | 'targetProfile' | 'style' | 'structuredParameters' | 'references'
  >
> & {
  readonly model: Readonly<Omit<ParsedSnapshot['model'], 'parameters'>> & {
    readonly parameters: Readonly<Record<string, JsonValue>>;
  };
  readonly prompts: {
    readonly main: Readonly<ParsedSnapshot['prompts']['main']>;
    readonly task: Readonly<ParsedSnapshot['prompts']['task']>;
    readonly supplemental: string;
  };
  readonly targetProfile: Readonly<ParsedSnapshot['targetProfile']>;
  readonly style: Readonly<Omit<ParsedSnapshot['style'], 'parameters'>> & {
    readonly parameters: Readonly<Record<string, JsonValue>>;
  };
  readonly structuredParameters: Readonly<Record<string, JsonValue>>;
  readonly references: readonly Readonly<ParsedSnapshot['references'][number]>[];
};
function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function freezeTaskSnapshot(input: unknown): TaskSnapshot {
  // Zod parses into a fresh tree; freezing cannot freeze/mutate the caller's registry.
  return freeze(TaskSnapshotSchema.parse(input));
}

export type Submission =
  | { readonly outcome: 'KNOWN'; readonly predictionId: string }
  | { readonly outcome: 'UNKNOWN'; readonly reason: 'CONNECTION_LOST' | 'AMBIGUOUS_RESPONSE' }
  | { readonly outcome: 'REJECTED'; readonly code: string };
export type RemoteResult =
  | { readonly status: 'RUNNING' }
  | {
      readonly status: 'SUCCEEDED';
      readonly outputs: readonly { readonly url: string; readonly expiresAt: string | null }[];
    }
  | { readonly status: 'FAILED'; readonly code: string };
export interface ProviderAdapter {
  readonly provider: 'mock' | 'wavespeed';
  readonly adapterVersion: string;
  submit(snapshot: TaskSnapshot, signal: AbortSignal): Promise<Submission>;
  query(predictionId: string, signal: AbortSignal): Promise<RemoteResult>;
  // A cancellation request never implies remote cancellation was successful.
  cancel?(
    predictionId: string,
    signal: AbortSignal,
  ): Promise<'CONFIRMED' | 'UNSUPPORTED' | 'UNKNOWN'>;
}
export interface AiGateway {
  adapterFor(snapshot: TaskSnapshot): ProviderAdapter;
}
export type DurableArtifact = {
  readonly assetId: string;
  readonly revision: string;
  readonly sha256: string;
};
export type TaskRecord = {
  readonly id: string;
  readonly projectId: string;
  readonly expectedProjectRevision: string;
  readonly snapshot: TaskSnapshot;
  readonly version: number;
} & (
  | {
      readonly state: 'CREATED' | 'QUEUED' | 'SUBMITTING' | 'SUBMISSION_UNKNOWN';
      readonly predictionId: null;
      readonly artifacts: readonly [];
    }
  | {
      readonly state: 'REMOTE_RUNNING' | 'FETCHING_RESULT' | 'VALIDATING_AND_INGESTING';
      readonly predictionId: string;
      readonly artifacts: readonly [];
    }
  | {
      readonly state: 'COMPLETED';
      readonly predictionId: string;
      readonly artifacts: readonly [DurableArtifact, ...DurableArtifact[]];
    }
  | {
      readonly state: 'FAILED' | 'CANCEL_REQUESTED' | 'CANCELLED_LOCAL';
      readonly predictionId: string | null;
      readonly artifacts: readonly DurableArtifact[];
    }
);
export type ModelRevision = TaskSnapshot['model'];
export interface DefaultModelConfiguration {
  readonly configurationVersion: string;
  readonly imageGenerate: ModelRevision;
  readonly imageEdit: ModelRevision;
  readonly imageEditReferencePreparation?: 'match-output-nearest-explicit-v1';
}
export type PromptTemplateRevision = TaskSnapshot['prompts']['main'];
export type RecoveryDirective =
  'WAIT' | 'QUERY_KNOWN_ID' | 'RECONCILE_UNKNOWN_NO_RESUBMIT' | 'RETRY_ARCHIVE_ONLY' | 'STOP_LOCAL';
export interface TaskStore {
  get(id: string): Promise<TaskRecord | null>;
  compareAndSet(expectedVersion: number, next: TaskRecord): Promise<boolean>;
}
export interface ResultArchiver {
  archive(
    task: TaskRecord,
    result: Extract<RemoteResult, { status: 'SUCCEEDED' }>,
    signal: AbortSignal,
  ): Promise<readonly DurableArtifact[]>;
}
// Step 06 implements recovery/CAS/idempotency/late completion; provider owns submit/query only.
export interface LocalTaskExecutor {
  enqueue(task: TaskRecord): Promise<void>;
  resume(taskId: string, directive: RecoveryDirective): Promise<void>;
  requestLocalCancellation(taskId: string): Promise<void>;
}
export {
  MAIN_PROMPT,
  PROMPT_REGISTRY,
  DEFAULT_MODELS,
  WAVESPEED_ADAPTER_VERSION,
  composeTaskSnapshot,
  renderFrozenPrompt,
} from './prompts.js';
export type { PromptRequest } from './prompts.js';
