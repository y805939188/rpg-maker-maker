import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
export const EXPLORATION = Object.freeze({
  version: 'step09-exploration-v1',
  totalUsd: 1,
  maxSubmissions: 10,
  reservePerSubmissionUsd: 0.05,
  concurrency: 1,
  initialSubmissions: 4,
  cases: ['T01', 'R01'],
  attemptsPerCase: 2,
  repairsPerCase: 1,
  manualMinutesPerCase: 15,
  referenceSha256: '1eaf10e898b7c26bc24788bf336b31842e6d292e2ade2c9de34b027a41e7c0bd',
});
const approvalSchema = z
  .object({
    version: z.literal(EXPLORATION.version),
    approvedBy: z.literal('HUMAN_USER'),
    authorization: z.string().min(10),
    approvedAt: z.string().datetime(),
    totalUsd: z.literal(1),
    maxSubmissions: z.literal(10),
  })
  .strict();
const eventSchema = z
  .object({
    state: z.enum([
      'RESERVED',
      'KNOWN',
      'FAILED',
      'UNKNOWN',
      'ARCHIVED',
      'CANCELLED',
      'UNUSABLE',
      'DISCARDED',
      'ARCHIVE_FAILED',
      'ARCHIVE_RETRY',
    ]),
    at: z.string().datetime(),
  })
  .strict();
const entrySchema = z
  .object({
    taskId: z.string().uuid(),
    caseId: z.enum(['T01', 'R01']),
    purpose: z.enum(['initial', 'retry', 'repair']),
    component: z.enum(['grass', 'water']),
    quotedUsd: z.number().finite().nonnegative(),
    reservedUsd: z.literal(0.05),
    state: eventSchema.shape.state,
    events: z.array(eventSchema).default([]),
    actualChargedUsd: z.literal('UNVERIFIED'),
    at: z.string().datetime(),
  })
  .strict();
const ledgerSchema = z
  .object({ version: z.literal(EXPLORATION.version), entries: z.array(entrySchema) })
  .strict();
export type Step09Entry = z.infer<typeof entrySchema>;
export function sharedStep09BudgetRoot(checkout: string) {
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd: checkout,
    encoding: 'utf8',
  }).trim();
  return resolve(dirname(common), '.local/step09-budget');
}
async function locked<T>(root: string, fn: () => Promise<T>) {
  await mkdir(root, { recursive: true, mode: 0o700 });
  const path = resolve(root, 'ledger.lock');
  const lock = await open(path, 'wx', 0o600).catch(() => {
    throw Error('STEP09_BUDGET_LOCKED');
  });
  try {
    return await fn();
  } finally {
    await lock.close();
    await unlink(path);
  }
}
async function readLedger(root: string) {
  try {
    return ledgerSchema.parse(JSON.parse(await readFile(resolve(root, 'ledger.json'), 'utf8')));
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT')
      return { version: EXPLORATION.version, entries: [] as Step09Entry[] };
    throw Error('STEP09_LEDGER_INVALID', { cause: e });
  }
}
async function save(root: string, ledger: z.infer<typeof ledgerSchema>) {
  const stage = resolve(root, `ledger-${randomUUID()}.tmp`),
    fd = await open(stage, 'wx', 0o600);
  try {
    await fd.writeFile(JSON.stringify(ledger));
    await fd.sync();
  } finally {
    await fd.close();
  }
  await rename(stage, resolve(root, 'ledger.json'));
  const dir = await open(root, 'r');
  try {
    await dir.sync();
  } finally {
    await dir.close();
  }
}
export async function assertStep09Approved(root: string) {
  try {
    return approvalSchema.parse(JSON.parse(await readFile(resolve(root, 'approval.json'), 'utf8')));
  } catch {
    throw Error('STEP09_BUDGET_NOT_APPROVED');
  }
}
export async function reserveStep09(
  root: string,
  input: Pick<Step09Entry, 'taskId' | 'caseId' | 'purpose' | 'component' | 'quotedUsd'>,
  model: string,
) {
  return locked(root, async () => {
    const approval = await assertStep09Approved(root),
      ledger = await readLedger(root);
    const ceiling =
      model === 'wavespeed-ai/flux-schnell'
        ? 0.003
        : model === 'wavespeed-ai/flux-dev'
          ? 0.012
          : NaN;
    if (
      !Number.isFinite(input.quotedUsd) ||
      input.quotedUsd < 0 ||
      input.quotedUsd > ceiling ||
      !Number.isFinite(ceiling) ||
      (input.caseId === 'T01' && model !== 'wavespeed-ai/flux-schnell') ||
      (input.caseId === 'R01' && model !== 'wavespeed-ai/flux-dev')
    )
      throw Error('STEP09_PRICE_BLOCKED');
    if (ledger.entries.some((e) => e.taskId === input.taskId))
      throw Error('STEP09_ALREADY_RESERVED');
    if (ledger.entries.some((e) => ['UNKNOWN', 'RESERVED'].includes(e.state)))
      throw Error('STEP09_UNRESOLVED_SUBMISSION');
    if (
      ledger.entries.length >= approval.maxSubmissions ||
      ledger.entries.reduce((n, e) => n + e.reservedUsd, 0) + 0.05 > approval.totalUsd
    )
      throw Error('STEP09_BUDGET_EXHAUSTED');
    const same = ledger.entries.filter(
      (e) => e.caseId === input.caseId && e.purpose === input.purpose,
    );
    if (
      same.length >= (input.purpose === 'repair' ? 1 : 2) ||
      same.some((e) => e.component === input.component)
    )
      throw Error('STEP09_CASE_LIMIT');
    if (
      input.purpose !== 'initial' &&
      !ledger.entries.some((e) => e.caseId === input.caseId && e.purpose === 'initial')
    )
      throw Error('STEP09_SEQUENCE');
    if (input.purpose !== 'initial') {
      const prior = ledger.entries.filter(
        (e) => e.caseId === input.caseId && e.purpose === 'initial',
      );
      if (
        prior.length !== 2 ||
        !prior.some((e) =>
          e.events.some((v) => ['FAILED', 'UNUSABLE', 'DISCARDED'].includes(v.state)),
        )
      )
        throw Error('STEP09_REPAIR_RETRY_REQUIRES_RECORDED_FAILURE');
    }
    const entry = entrySchema.parse({
      ...input,
      reservedUsd: 0.05,
      state: 'RESERVED',
      events: [{ state: 'RESERVED', at: new Date().toISOString() }],
      actualChargedUsd: 'UNVERIFIED',
      at: new Date().toISOString(),
    });
    ledger.entries.push(entry);
    await save(root, ledger);
    return entry;
  });
}
export async function recordStep09(root: string, taskId: string, state: Step09Entry['state']) {
  await locked(root, async () => {
    const ledger = await readLedger(root),
      entry = ledger.entries.find((e) => e.taskId === taskId);
    if (!entry) throw Error('STEP09_RESERVATION_MISSING');
    if (entry.state === 'UNKNOWN' && state !== 'UNKNOWN')
      throw Error('STEP09_UNKNOWN_REQUIRES_HUMAN_RECONCILIATION');
    entry.state = state;
    entry.events.push({ state, at: new Date().toISOString() });
    await save(root, ledger);
  });
}
export async function step09Summary(root: string) {
  const ledger = await readLedger(root);
  return {
    plan: EXPLORATION,
    approval: await assertStep09Approved(root).then(
      () => true,
      () => false,
    ),
    submissions: ledger.entries.length,
    counters: {
      failed: ledger.entries.filter((e) => e.events.some((v) => v.state === 'FAILED')).length,
      unknown: ledger.entries.filter((e) => e.events.some((v) => v.state === 'UNKNOWN')).length,
      unusable: ledger.entries.filter((e) => e.events.some((v) => v.state === 'UNUSABLE')).length,
      archived: ledger.entries.filter((e) => e.events.some((v) => v.state === 'ARCHIVED')).length,
      discarded: ledger.entries.filter((e) => e.events.some((v) => v.state === 'DISCARDED')).length,
      retrySubmissions: ledger.entries.filter((e) => e.purpose === 'retry').length,
      componentRepairs: ledger.entries.filter((e) => e.purpose === 'repair').length,
      archiveRetries: ledger.entries.reduce(
        (n, e) => n + e.events.filter((v) => v.state === 'ARCHIVE_RETRY').length,
        0,
      ),
      archiveFailures: ledger.entries.reduce(
        (n, e) => n + e.events.filter((v) => v.state === 'ARCHIVE_FAILED').length,
        0,
      ),
    },
    quotedUsd: ledger.entries.reduce((n, e) => n + e.quotedUsd, 0),
    reservedUsd: ledger.entries.reduce((n, e) => n + e.reservedUsd, 0),
    actualChargedUsd: 'UNVERIFIED',
    entries: ledger.entries,
  };
}
