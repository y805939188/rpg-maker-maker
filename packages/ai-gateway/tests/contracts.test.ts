import { describe, expect, it } from 'vitest';
import {
  freezeTaskSnapshot,
  TaskStateSchema,
  type ProviderAdapter,
  type LocalTaskExecutor,
  type TaskSnapshot,
} from '../src/index.js';
function fixture() {
  return {
    contractVersion: 'task-snapshot-v1',
    configurationVersion: 'registry@1',
    taskKind: 'IMAGE_GENERATE',
    model: {
      provider: 'mock',
      modelId: 'mock-image',
      modelVersion: '1',
      adapterVersion: '1',
      parameters: { seed: 3 },
    },
    prompts: {
      main: { id: 'main', revision: '1', content: 'source components only' },
      task: { id: 'ground', revision: '1', content: 'repeatable pixel texture' },
      supplemental: '',
    },
    targetProfile: { id: 'mz-native-ground-water', version: '1.0.0-candidate.1' },
    style: { id: 'style', revision: '1', parameters: { palette: ['green', 'blue'] } },
    structuredParameters: { tile: 48 },
    references: [],
  };
}
describe('Gateway, snapshot and executor contracts (no runner)', () => {
  it('freezes a detached nested snapshot; new defaults cannot change an old task', () => {
    const registry = fixture();
    const old = freezeTaskSnapshot(registry);
    registry.model.modelId = 'new-model';
    registry.prompts.main.content = 'changed';
    registry.style.parameters.palette[0] = 'red';
    expect(old.model.modelId).toBe('mock-image');
    expect(old.prompts.main.content).toBe('source components only');
    expect(old.style.parameters['palette']).toEqual(['green', 'blue']);
    expect(Object.isFrozen(old.model.parameters)).toBe(true);
    expect(() => {
      (old.model.parameters as Record<string, unknown>)['seed'] = 99;
    }).toThrow();
    expect(freezeTaskSnapshot(registry).model.modelId).toBe('new-model');
  });
  it('rejects credential fields, unknown snapshots, nonfinite parameters and missing edit references', () => {
    const input = fixture();
    expect(() => freezeTaskSnapshot({ ...input, apiKey: 'secret' })).toThrow();
    expect(() =>
      freezeTaskSnapshot({ ...input, model: { ...input.model, apiKey: 'secret' } }),
    ).toThrow();
    expect(() => freezeTaskSnapshot({ ...input, structuredParameters: { n: Infinity } })).toThrow();
    expect(() => freezeTaskSnapshot({ ...input, taskKind: 'IMAGE_EDIT' })).toThrow();
    expect(() =>
      freezeTaskSnapshot({
        ...input,
        taskKind: 'IMAGE_EDIT',
        references: [
          {
            assetId: 'a88c3c1b-f962-42d0-ae52-76988347d341',
            revision: '3',
            sha256: 'a'.repeat(64),
          },
        ],
      }),
    ).not.toThrow();
  });
  it('represents ambiguous submit separately from known ID and durable success', async () => {
    const contractDouble: ProviderAdapter = {
      provider: 'mock',
      adapterVersion: 'test-contract-only',
      submit: async (_snapshot: TaskSnapshot, _signal: AbortSignal) => ({
        outcome: 'UNKNOWN',
        reason: 'CONNECTION_LOST',
      }),
      query: async (_id: string, _signal: AbortSignal) => ({ status: 'RUNNING' }),
    };
    expect(
      await contractDouble.submit(freezeTaskSnapshot(fixture()), new AbortController().signal),
    ).toEqual({ outcome: 'UNKNOWN', reason: 'CONNECTION_LOST' });
    expect(TaskStateSchema.parse('SUBMISSION_UNKNOWN')).toBe('SUBMISSION_UNKNOWN');
    expect(TaskStateSchema.parse('VALIDATING_AND_INGESTING')).not.toBe('COMPLETED');
    // Type check only: no recover method exists on the provider and executor owns recovery.
    const executorContract: keyof LocalTaskExecutor = 'resume';
    expect(executorContract).toBe('resume');
  });
});
