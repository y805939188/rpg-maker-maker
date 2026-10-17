import { readFile, open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
const entrySchema = z
  .object({
    taskId: z.string().uuid(),
    reservedUsd: z.number().finite().positive(),
    quotedUsd: z.number().finite().nonnegative(),
    submittedAt: z.string().datetime(),
  })
  .strict()
  .refine((entry) => entry.quotedUsd <= entry.reservedUsd);
export type RecordEntry = z.infer<typeof entrySchema>;
export async function readStep08Reservation(
  root: string,
  kind: 'generate' | 'edit',
): Promise<RecordEntry | null> {
  try {
    return entrySchema.parse(
      JSON.parse(await readFile(resolve(root, `${kind}-reservation.json`), 'utf8')),
    );
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
      return null;
    throw Error('LIVE_RECORD_INVALID', { cause: error });
  }
}
/** Caller holds the single process/file run lock. Reservations are never refunded/reused. */
export async function reserveStep08Submission(
  root: string,
  kind: 'generate' | 'edit',
  taskId: string,
  model: string,
  quotedUsd: number,
  budgetUsd: number,
): Promise<RecordEntry> {
  const ceiling =
    model === 'wavespeed-ai/flux-schnell' ? 0.003 : model === 'wavespeed-ai/flux-dev' ? 0.012 : NaN;
  if (
    (kind === 'edit' && model !== 'wavespeed-ai/flux-dev') ||
    !Number.isFinite(ceiling) ||
    !Number.isFinite(quotedUsd) ||
    quotedUsd < 0 ||
    quotedUsd > ceiling ||
    !Number.isFinite(budgetUsd) ||
    budgetUsd <= 0
  )
    throw Error('PRICE_OR_BUDGET_BLOCKED');
  const records = await Promise.all(
    (['generate', 'edit'] as const).map((name) => readStep08Reservation(root, name)),
  );
  if (records[kind === 'generate' ? 0 : 1]) throw Error('PAID_SUBMISSION_ALREADY_RESERVED');
  if (
    records.reduce((total, record) => total + (record?.reservedUsd ?? 0), 0) + ceiling >
    budgetUsd
  )
    throw Error('PRICE_OR_BUDGET_BLOCKED');
  const entry = entrySchema.parse({
    taskId,
    reservedUsd: ceiling,
    quotedUsd,
    submittedAt: new Date().toISOString(),
  });
  const file = await open(resolve(root, `${kind}-reservation.json`), 'wx', 0o600);
  try {
    await file.writeFile(JSON.stringify(entry, null, 2));
    await file.sync();
  } finally {
    await file.close();
  }
  const directory = await open(root, 'r');
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
  return entry;
}
