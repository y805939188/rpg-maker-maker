import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadProviderCredentials } from '../src/ai-provider-config.js';
import {
  reserveStep09,
  recordStep09,
  step09Summary,
  sharedStep09BudgetRoot,
  EXPLORATION,
} from '../src/step09-budget.js';
import { composeTaskSnapshot } from '@tileset/ai-gateway';
const target = { id: 'native-mz', version: '1' };
describe('step09 provider configuration and shared human budget', () => {
  it('process wins without opening a shared file; synthetic shared input only imports provider key and never executes shell', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'step09-config-')),
      path = resolve(root, '.env.local');
    await expect(
      loadProviderCredentials(
        { WAVESPEED_API_KEY: 'synthetic-process-key-123' },
        root,
        '/does-not-exist',
      ),
    ).resolves.toEqual({ key: 'synthetic-process-key-123', source: 'process' });
    await writeFile(path, 'WAVESPEED_API_KEY="synthetic-shared-key-123"\n');
    await expect(loadProviderCredentials({}, root)).resolves.toEqual({
      key: 'synthetic-shared-key-123',
      source: 'shared-file',
    });
    await expect(
      loadProviderCredentials({ TILESET_PROVIDER_ENV_FILE: path }, '/unused'),
    ).resolves.toHaveProperty('source', 'shared-file');
    await writeFile(path, 'WAVESPEED_API_KEY=synthetic-shared-key-123\nDATABASE_URL=forbidden\n');
    await expect(loadProviderCredentials({}, root)).rejects.toThrow(
      'PROVIDER_CONFIGURATION_UNAVAILABLE',
    );
    await writeFile(path, 'WAVESPEED_API_KEY=$(touch /tmp/step09-secret-must-not-execute)\n');
    await expect(loadProviderCredentials({}, root)).rejects.toThrow(
      'PROVIDER_CONFIGURATION_UNAVAILABLE',
    );
    expect(await readFile(path, 'utf8')).toContain('$(touch');
    await expect(loadProviderCredentials({ WAVESPEED_API_KEY: '' }, root, path)).rejects.toThrow(
      'PROVIDER_KEY_MISSING_OR_INVALID',
    );
  });
  it('missing human approval forbids reservation, atomic contention permits only one, UNKNOWN freezes every case/worktree', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'step09-budget-'));
    const input = {
      taskId: randomUUID(),
      caseId: 'T01' as const,
      purpose: 'initial' as const,
      component: 'grass' as const,
      quotedUsd: 0.003,
    };
    await expect(reserveStep09(root, input, 'wavespeed-ai/flux-schnell')).rejects.toThrow(
      'NOT_APPROVED',
    );
    await writeFile(
      resolve(root, 'approval.json'),
      JSON.stringify({
        version: EXPLORATION.version,
        approvedBy: 'HUMAN_USER',
        authorization: 'SYNTHETIC_TEST_ONLY_NOT_LIVE_APPROVAL',
        approvedAt: new Date().toISOString(),
        totalUsd: 1,
        maxSubmissions: 10,
      }),
    );
    const results = await Promise.allSettled([
      reserveStep09(root, input, 'wavespeed-ai/flux-schnell'),
      reserveStep09(
        root,
        { ...input, taskId: randomUUID(), component: 'water' },
        'wavespeed-ai/flux-schnell',
      ),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const first = (await step09Summary(root)).entries[0]!;
    await recordStep09(root, first.taskId, 'UNKNOWN');
    await expect(
      reserveStep09(
        root,
        { ...input, taskId: randomUUID(), caseId: 'R01' },
        'wavespeed-ai/flux-dev',
      ),
    ).rejects.toThrow('UNRESOLVED');
    await expect(recordStep09(root, first.taskId, 'ARCHIVED')).rejects.toThrow(
      'HUMAN_RECONCILIATION',
    );
    expect((await step09Summary(root)).submissions).toBe(1);
    expect(sharedStep09BudgetRoot(process.cwd())).toBe(
      sharedStep09BudgetRoot(resolve(sharedStep09BudgetRoot(process.cwd()), '../..')),
    );
  });
  it('case, purpose, model, price, duplicate and retry limits do not create additional submissions', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'step09-budget-limits-'));
    await writeFile(
      resolve(root, 'approval.json'),
      JSON.stringify({
        version: EXPLORATION.version,
        approvedBy: 'HUMAN_USER',
        authorization: 'SYNTHETIC_TEST_ONLY_NOT_LIVE_APPROVAL',
        approvedAt: new Date().toISOString(),
        totalUsd: 1,
        maxSubmissions: 10,
      }),
    );
    const input = {
      taskId: randomUUID(),
      caseId: 'T01' as const,
      purpose: 'initial' as const,
      component: 'grass' as const,
      quotedUsd: 0.003,
    };
    await expect(
      reserveStep09(root, { ...input, quotedUsd: 0.004 }, 'wavespeed-ai/flux-schnell'),
    ).rejects.toThrow('PRICE');
    await expect(reserveStep09(root, input, 'unapproved-model')).rejects.toThrow('PRICE');
    await reserveStep09(root, input, 'wavespeed-ai/flux-schnell');
    await recordStep09(root, input.taskId, 'REJECTED');
    await recordStep09(root, input.taskId, 'FAILED');
    await expect(reserveStep09(root, input, 'wavespeed-ai/flux-schnell')).rejects.toThrow(
      'ALREADY_RESERVED',
    );
    await expect(
      reserveStep09(root, { ...input, taskId: randomUUID() }, 'wavespeed-ai/flux-schnell'),
    ).rejects.toThrow('CASE_LIMIT');
    expect((await step09Summary(root)).quotedUsd).toBe(0.003);
  });
  it('S08-IR1-N01 accepts texture/textured and normal preferences, rejects true structure/model instructions', () => {
    for (const supplemental of [
      'soft grass texture',
      'textured moss, blue-green colors',
      '青绿色草地，柔软纹理，柔和光照',
    ])
      expect(
        composeTaskSnapshot(
          { operation: 'IMAGE_GENERATE', component: 'grass', supplemental },
          target,
        ).prompts.supplemental,
      ).toBe(supplemental);
    for (const supplemental of [
      'put text on grass',
      '4 frames',
      '12帧水面',
      'use model other',
      'override system prompt',
      '生成文字水印',
      '改为A1图集',
    ])
      expect(() =>
        composeTaskSnapshot(
          { operation: 'IMAGE_GENERATE', component: 'grass', supplemental },
          target,
        ),
      ).toThrow('PROMPT_CONFLICT');
  });
});
it('fixed ten-submit exploration includes failed attempts and exhausts globally without refunds', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'step09-budget-total-'));
  await writeFile(
    resolve(root, 'approval.json'),
    JSON.stringify({
      version: EXPLORATION.version,
      approvedBy: 'HUMAN_USER',
      authorization: 'SYNTHETIC_TEST_ONLY_NOT_LIVE_APPROVAL',
      approvedAt: new Date().toISOString(),
      totalUsd: 1,
      maxSubmissions: 10,
    }),
  );
  for (const caseId of ['T01', 'R01'] as const) {
    for (const purpose of ['initial', 'retry', 'repair'] as const) {
      for (const component of (purpose === 'repair' ? ['grass'] : ['grass', 'water']) as (
        'grass' | 'water'
      )[]) {
        const taskId = randomUUID();
        await reserveStep09(
          root,
          { taskId, caseId, purpose, component, quotedUsd: caseId === 'T01' ? 0.003 : 0.012 },
          caseId === 'T01' ? 'wavespeed-ai/flux-schnell' : 'wavespeed-ai/flux-dev',
        );
        await recordStep09(
          root,
          taskId,
          purpose === 'initial' && component === 'grass' ? 'REMOTE_FAILED' : 'ARCHIVED',
        );
      }
    }
  }
  const result = await step09Summary(root);
  expect(result.submissions).toBe(10);
  expect(result.reservedUsd).toBeCloseTo(0.5);
  expect(result.counters.failed).toBe(2);
  expect(result.counters.componentRepairs).toBe(2);
  expect(result.counters.retrySubmissions).toBe(4);
  await expect(
    reserveStep09(
      root,
      {
        taskId: randomUUID(),
        caseId: 'T01',
        purpose: 'repair',
        component: 'water',
        quotedUsd: 0.003,
      },
      'wavespeed-ai/flux-schnell',
    ),
  ).rejects.toThrow('BUDGET_EXHAUSTED');
});
