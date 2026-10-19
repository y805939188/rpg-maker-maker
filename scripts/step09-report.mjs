import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { Persistence } from '@tileset/persistence';
import { loadEnvironment, parseConfig, repositoryRoot } from '../apps/api/dist/config.js';
import { sharedStep09BudgetRoot, step09Summary } from '../apps/api/dist/step09-budget.js';
import { PROFILE } from '../dist/src/profile.js';
loadEnvironment();
const config = parseConfig(process.env),
  store = new Persistence(
    config.DATABASE_URL,
    resolve(repositoryRoot, process.env['TILESET_ASSET_ROOT'] ?? '.local/assets'),
    PROFILE,
  );
try {
  const tasks = await store.db.logicalTask.findMany({
    include: { attempts: true, artifacts: true },
    orderBy: { createdAt: 'asc' },
  });
  const real = tasks.filter(
    (t) =>
      t.snapshot.structuredParameters?.studioVersion === 'step09-ai-studio-v1' &&
      t.snapshot.model?.provider === 'wavespeed',
  );
  const conversions = await store.db.aiConversion.findMany();
  const packs = [];
  for (const b of await store.db.build.findMany({ include: { projectSnapshot: true } })) {
    const ref = b.projectSnapshot.adoption.find((r) => r.kind === 'recipe');
    if (!ref) continue;
    const recipe = await store.db.assetRevision.findFirst({
      where: { projectId: b.projectId, logicalId: ref.id, revision: ref.revision, kind: 'recipe' },
    });
    if (!recipe) continue;
    const deps = await store.db.revisionDependency.findMany({ where: { fromId: recipe.id } });
    const linked = conversions.filter(
      (c) =>
        c.projectId === b.projectId &&
        Array.isArray(c.outputs) &&
        c.outputs.some((id) => deps.some((d) => d.toId === id)),
    );
    if (!linked.length) continue;
    const providers = [
      ...new Set(linked.map((c) => tasks.find((t) => t.id === c.taskId)?.snapshot.model?.provider)),
    ];
    const e = await store.db.finalExport.findUnique({ where: { buildId: b.id } });
    packs.push({
      projectId: b.projectId,
      buildId: b.id,
      providers,
      manifestSha256: e?.manifestSha ?? null,
      structural: e ? 'STRUCTURAL_PASS' : 'NOT_EXECUTED',
      mz: 'NOT_EXECUTED',
      art: 'PENDING_USER_ACCEPTANCE',
      conversionIds: linked.map((c) => c.id),
    });
  }
  const ledger = await step09Summary(sharedStep09BudgetRoot(repositoryRoot));
  const realPacks = packs.filter((p) => p.providers.every((v) => v === 'wavespeed'));
  const report = {
    version: 'step09-statistics-v1',
    unit: 'complete usable Pack; task COMPLETED and structural checks alone are insufficient',
    counts: {
      logicalRealTasks: real.length,
      submissions: real.reduce((n, t) => n + t.attempts.length, 0),
      failed: real.filter((t) => t.state === 'FAILED').length,
      unknown: real.filter((t) => t.state === 'SUBMISSION_UNKNOWN').length,
      cancelled: real.filter((t) => t.state === 'CANCELLED_LOCAL').length,
      unusable: conversions.filter(
        (c) => real.some((t) => t.id === c.taskId) && c.descriptor.status === 'REJECTED',
      ).length,
      archived: real.filter((t) => t.archiveState === 'DURABLE').length,
      discarded: real.filter((t) => t.errorCode === 'CANDIDATE_DISCARDED').length,
      retryTasks: real.filter((t) => t.snapshot.structuredParameters.purpose === 'retry').length,
      componentRepairTasks: real.filter((t) => t.snapshot.structuredParameters.purpose === 'repair')
        .length,
      technicalRealPacks: realPacks.length,
      usableRealPacks: 'UNVERIFIED_PENDING_MZ_AND_ART',
    },
    attemptBatches: [...new Set(real.map((t) => t.snapshot.structuredParameters.batch))],
    successRate: 'N/A_PENDING_REAL_AND_HUMAN_ACCEPTANCE',
    averageAttemptsPerUsablePack: 'N/A',
    costPerUsablePack: 'N/A',
    ledger,
    packs,
    actualCharges: 'UNVERIFIED',
    limitations:
      'Mock Packs are excluded from real success/cost metrics. All started batches, failed, cancelled, unknown, rejected and discarded candidates remain in the denominator. Human scoring and MZ are never inferred from CPU/web checks.',
  };
  const output = process.argv[2];
  if (output)
    await writeFile(resolve(output), JSON.stringify(report, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
  else console.log(JSON.stringify(report, null, 2));
} finally {
  await store.close();
}
