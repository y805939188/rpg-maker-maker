import { it, expect } from 'vitest';
import { mkdtemp, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { reserveStep08Submission, readStep08Reservation } from '../src/step08-budget.js';
it('reserves at most Generate once + Edit once with cumulative full-price ceilings, fail closed before paid submission', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'step08-budget-'));
  const id = '9ead7c5f-ea94-49d6-9b82-a1930e740c7b';
  for (const quote of [NaN, Infinity, -1, 0.0031])
    await expect(
      reserveStep08Submission(root, 'generate', id, 'wavespeed-ai/flux-schnell', quote, 5),
    ).rejects.toThrow('PRICE_OR_BUDGET_BLOCKED');
  await expect(
    reserveStep08Submission(root, 'generate', id, 'wavespeed-ai/flux-schnell', 0.003, 0.002),
  ).rejects.toThrow();
  expect(await readdir(root)).toEqual([]);
  expect(
    (await reserveStep08Submission(root, 'generate', id, 'wavespeed-ai/flux-schnell', 0.003, 5))
      .reservedUsd,
  ).toBe(0.003);
  await expect(
    reserveStep08Submission(root, 'generate', id, 'wavespeed-ai/flux-schnell', 0, 5),
  ).rejects.toThrow('ALREADY_RESERVED');
  await expect(
    reserveStep08Submission(root, 'edit', id, 'wavespeed-ai/flux-dev', 0.012, 0.014),
  ).rejects.toThrow();
  expect(await readStep08Reservation(root, 'edit')).toBeNull();
  expect(
    (await reserveStep08Submission(root, 'edit', id, 'wavespeed-ai/flux-dev', 0.012, 5))
      .reservedUsd,
  ).toBe(0.012);
  await expect(
    reserveStep08Submission(root, 'edit', id, 'wavespeed-ai/flux-dev', 0.012, 5),
  ).rejects.toThrow('ALREADY_RESERVED');
  expect(await readdir(root)).toHaveLength(2);
  await expect(
    reserveStep08Submission(root, 'edit-size-fix', id, 'wavespeed-ai/flux-schnell', 0.003, 5),
  ).rejects.toThrow('PRICE_OR_BUDGET_BLOCKED');
  await expect(
    reserveStep08Submission(root, 'edit-size-fix', id, 'wavespeed-ai/flux-dev', 0.012, 0.026),
  ).rejects.toThrow('PRICE_OR_BUDGET_BLOCKED');
  expect(
    (await reserveStep08Submission(root, 'edit-size-fix', id, 'wavespeed-ai/flux-dev', 0.012, 5))
      .reservedUsd,
  ).toBe(0.012);
  await expect(
    reserveStep08Submission(root, 'edit-size-fix', id, 'wavespeed-ai/flux-dev', 0.012, 5),
  ).rejects.toThrow('ALREADY_RESERVED');
  expect(await readdir(root)).toHaveLength(3);
});
it('additional Edit slot cannot start without the preserved original records or use an unregistered slot', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'step08-additional-budget-'));
  const id = '9ead7c5f-ea94-49d6-9b82-a1930e740c7b';
  await expect(
    reserveStep08Submission(root, 'edit-size-fix', id, 'wavespeed-ai/flux-dev', 0.012, 5),
  ).rejects.toThrow('REQUIRES_PRIOR_RECORDS');
  await expect(
    reserveStep08Submission(root, 'edit-fourth' as never, id, 'wavespeed-ai/flux-dev', 0.012, 5),
  ).rejects.toThrow('SUBMISSION_KIND');
  expect(await readdir(root)).toHaveLength(0);
});
