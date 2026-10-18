import { beforeAll, afterAll, it, expect, vi } from 'vitest';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { chromium, expect as browserExpect } from '@playwright/test';
import { hashBytes } from '@tileset/asset-core';
import { AiStateSchema, StudioSchema } from '@tileset/contracts';
import { loadEnvironment, parseConfig } from '../../src/config.js';
import {
  StudioService,
  type Resources,
  type BuildFailureObservation,
} from '../../src/studio-service.js';
import { createApplication } from '../../src/app.js';
import { readStoredStandardZip } from '../studio/stored-zip.js';
loadEnvironment();
const root = resolve('.local/step09/integration', randomUUID());
let running: Awaited<ReturnType<typeof createApplication>>, url: string, admin: PrismaClient;
const evidence: unknown[] = [];
const buildFailures: BuildFailureObservation[] = [];
let failBeforePublish = false;
async function request(path: string, body?: unknown) {
  const r = await fetch(
    url + path,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: {
            Origin: url,
            'Content-Type': 'application/json',
            'X-Tileset-Client': 'local-v1',
          },
          body: JSON.stringify(body),
        },
  );
  const data: unknown = await r.json();
  if (!r.ok) throw Error(JSON.stringify(data));
  return data;
}
async function fresh(name: string) {
  return (await request('/api/projects', { name })) as { id: string };
}
async function ai(p: string) {
  return AiStateSchema.parse(await request(`/api/projects/${p}/ai`));
}
async function studio(p: string) {
  return StudioSchema.parse(await request(`/api/projects/${p}/studio`));
}
async function waitCandidates(p: string, count: number) {
  for (let i = 0; i < 40; i++) {
    const d = await ai(p);
    if (d.candidates.filter((c) => c.state === 'COMPLETED').length === count) return d;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw Error('CANDIDATE_TIMEOUT');
}
async function waitBuild(p: string) {
  for (let i = 0; i < 80; i++) {
    const s = await studio(p);
    if (!s.jobs.some((j) => ['QUEUED', 'RUNNING'].includes(j.state))) {
      if (s.jobs[0]?.state === 'FAILED')
        evidence.push({ failedProject: p, job: s.jobs[0], buildFailures });
      expect(s.jobs[0]?.state).toBe('COMPLETED');
      return s;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw Error('BUILD_TIMEOUT');
}
beforeAll(async () => {
  vi.stubEnv('TILESET_AI_MODE', 'mock');
  await mkdir(root, { recursive: true });
  const original = process.env['DATABASE_URL']!;
  admin = new PrismaClient({ datasources: { db: { url: original } }, log: [] });
  const name = 'tileset_step09_' + randomUUID().replaceAll('-', '');
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  const u = new URL(original);
  u.pathname = '/' + name;
  const migration = spawnSync(
    'pnpm',
    [
      '--filter',
      '@tileset/api',
      'exec',
      'prisma',
      'migrate',
      'deploy',
      '--schema',
      'prisma/schema.prisma',
    ],
    { encoding: 'utf8', env: { ...process.env, DATABASE_URL: u.href } },
  );
  await writeFile(resolve(root, 'migration.log'), migration.stdout + migration.stderr);
  expect(migration.status).toBe(0);
  const config = parseConfig({
    ...process.env,
    DATABASE_URL: u.href,
    API_PORT: '4409',
    WEB_PORT: '5309',
    NODE_ENV: 'production',
  });
  const resources = JSON.parse(
    await readFile(resolve('apps/api/dist/resources/studio.json'), 'utf8'),
  ) as Resources;
  const service = new StudioService(
    config,
    resources,
    resolve(root, 'assets'),
    async (point) => {
      if (failBeforePublish && point === 'before-db-commit')
        throw Error('SYNTHETIC_PRIVATE_PAYLOAD_MUST_NOT_APPEAR_IN_DIAGNOSTICS');
    },
    undefined,
    (observation) => buildFailures.push(observation),
  );
  running = await createApplication(config, service);
  await running.app.listen(4409, '127.0.0.1');
  url = 'http://127.0.0.1:4409';
});
afterAll(async () => {
  evidence.push({ buildFailures });
  await writeFile(resolve(root, 'summary.json'), JSON.stringify(evidence, null, 2));
  await running?.close();
  await admin?.$disconnect();
  vi.unstubAllEnvs();
});
it('both empty-supplement workflows produce complete actual Pack; water repair preserves exact unselected revisions, fixed bank and old downloads', async () => {
  for (const reference of [false, true]) {
    const project = await fresh(reference ? 'step09-reference-empty' : 'step09-default-empty');
    let referenceId: string | undefined;
    if (reference) {
      const bytes = await readFile('tests/fixtures/art-ground.png');
      const r = await fetch(`${url}/api/projects/${project.id}/ai/reference/upload`, {
        method: 'POST',
        headers: { Origin: url, 'Content-Type': 'image/png', 'X-Tileset-Client': 'local-v1' },
        body: bytes,
      });
      expect(r.status).toBe(201);
      referenceId = ((await r.json()) as { id: string }).id;
    }
    await request(`/api/projects/${project.id}/ai/create`, {
      expectedRevision: 0,
      supplemental: '',
      ...(referenceId ? { referenceId } : {}),
    });
    const candidates = await waitCandidates(project.id, 2),
      grass = candidates.candidates.find((c) => c.component === 'grass')!,
      water = candidates.candidates.find((c) => c.component === 'water')!;
    await request(`/api/projects/${project.id}/ai/apply`, {
      expectedRevision: 0,
      grassTask: grass.id,
      waterTask: water.id,
    });
    const first = await waitBuild(project.id),
      build = first.successfulBuildId!;
    expect(first.sources.every((s) => s.width === 96 && s.height === 144)).toBe(true);
    const download = await fetch(`${url}/api/projects/${project.id}/builds/${build}/download`),
      zip = Buffer.from(await download.arrayBuffer()),
      files = readStoredStandardZip(zip);
    expect(Object.keys(files)).toHaveLength(8);
    expect(hashBytes(zip)).toBe(download.headers.get('x-content-sha256'));
    for (const name of ['A1.png', 'A2.png', 'manifest.json']) {
      const f = await fetch(`${url}/api/projects/${project.id}/builds/${build}/files/${name}`);
      expect(Buffer.from(await f.arrayBuffer()).equals(files[name]!)).toBe(true);
    }
    const before = first.recipes.find((r) => r.current)!.components;
    const recipeId = first.recipes.find((r) => r.current)!.id;
    const frameBefore = await running.studio.processed(project.id, recipeId, 0);
    await request(`/api/projects/${project.id}/ai/create`, {
      expectedRevision: first.revision,
      supplemental: 'soft texture, blue-green colors',
      repair: 'water',
      ...(referenceId ? { referenceId } : {}),
    });
    const repair = (await waitCandidates(project.id, 3)).candidates.find(
      (c) => c.purpose === 'repair',
    )!;
    await request(`/api/projects/${project.id}/ai/apply`, {
      expectedRevision: first.revision,
      waterTask: repair.id,
    });
    const second = await waitBuild(project.id),
      after = second.recipes.find((r) => r.current)!.components;
    for (const c of ['grass', 'mask', 'overlay']) expect(after[c]).toBe(before[c]);
    for (const c of ['water-0', 'water-1', 'water-2']) expect(after[c]).not.toBe(before[c]);
    expect(second.successfulBuildId).not.toBe(build);
    expect(
      Buffer.from(
        await (
          await fetch(`${url}/api/projects/${project.id}/builds/${build}/download`)
        ).arrayBuffer(),
      ).equals(zip),
    ).toBe(true);
    const oldRecipe = await running.studio.store.readDomainRecipe(project.id, recipeId),
      newRecipe = await running.studio.store.readDomainRecipe(
        project.id,
        second.recipes.find((r) => r.current)!.id,
      );
    const bits = oldRecipe.built.ir.staticMaskImage.bytes(),
      old = oldRecipe.built.ir.frames[0]!.bytes();
    for (const frame of newRecipe.built.ir.frames) {
      const data = frame.bytes();
      for (let i = 0; i < bits.length; i += 4)
        if (bits[i] === 255)
          expect(Array.from(data.slice(i, i + 4))).toEqual(Array.from(old.slice(i, i + 4)));
    }
    expect(await running.studio.processed(project.id, recipeId, 0)).toEqual(frameBefore);
    if (!reference) {
      await request(`/api/projects/${project.id}/ai/create`, {
        expectedRevision: second.revision,
        supplemental: 'soft grass texture',
        repair: 'grass',
      });
      const grassRepair = (await waitCandidates(project.id, 4)).candidates.find(
        (c) => c.component === 'grass' && c.purpose === 'repair',
      )!;
      await request(`/api/projects/${project.id}/ai/apply`, {
        expectedRevision: second.revision,
        grassTask: grassRepair.id,
      });
      const third = await waitBuild(project.id),
        thirdComponents = third.recipes.find((r) => r.current)!.components;
      expect(thirdComponents.grass).not.toBe(after.grass);
      for (const c of ['water-0', 'water-1', 'water-2', 'mask', 'overlay'])
        expect(thirdComponents[c]).toBe(after[c]);
      const thirdRecipe = await running.studio.store.readDomainRecipe(
        project.id,
        third.recipes.find((r) => r.current)!.id,
      );
      const thirdFrame = thirdRecipe.built.ir.frames[0]!.bytes();
      for (let i = 0; i < bits.length; i += 4)
        if (bits[i] === 255)
          expect(Array.from(thirdFrame.slice(i, i + 4))).toEqual(Array.from(old.slice(i, i + 4)));
    }
    await request(`/api/projects/${project.id}/ai/action`, { taskId: grass.id, action: 'discard' });
    expect((await ai(project.id)).candidates.find((c) => c.id === grass.id)?.discarded).toBe(true);
    evidence.push({
      mode: reference ? 'reference' : 'text',
      mock: true,
      projectId: project.id,
      firstBuild: build,
      repairedBuild: second.successfulBuildId,
      zipSha256: hashBytes(zip),
      manifestSha256: hashBytes(files['manifest.json']!),
      preserved: ['grass', 'mask', 'overlay'],
      mz: 'NOT_EXECUTED',
    });
  }
});
it('real Chromium performs both product paths, optional texture preferences, candidate selection, repair, current/history preview and matching download', async () => {
  const browser = await chromium.launch({ headless: true });
  const network: unknown[] = [];
  const context = await browser.newContext();
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();
  const starts = new Map<string, number>();
  page.on('request', (r) => starts.set(r.url(), performance.now()));
  page.on('response', (r) => {
    if (network.length < 400)
      network.push({
        path: new URL(r.url()).pathname,
        status: r.status(),
        elapsedMs: performance.now() - (starts.get(r.url()) ?? performance.now()),
      });
  });
  try {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    for (const reference of [false, true]) {
      const project = await fresh(`step09-browser-${reference ? 'reference' : 'text'}`);
      await page.addInitScript((id) => localStorage.setItem('studio-project', id), project.id);
      await page.goto(url);
      const panel = page.getByRole('region', { name: 'AI 整套创作' });
      await browserExpect(panel).toBeVisible();
      if (reference)
        await panel.getByLabel('参考图（可选 PNG）').setInputFiles('tests/fixtures/art-ground.png');
      if (reference) await browserExpect(panel.getByText(/已上传参考/)).toBeVisible();
      await panel
        .getByRole('button', {
          name: reference ? '参考图生成完整素材候选' : '默认文字生成完整素材候选',
          exact: true,
        })
        .click();
      await browserExpect(panel.getByLabel('草地候选').locator('option')).toHaveCount(2, {
        timeout: 15000,
      });
      await browserExpect(panel.getByLabel('水面候选').locator('option')).toHaveCount(2, {
        timeout: 15000,
      });
      await panel.getByLabel('草地候选').selectOption({ index: 1 });
      await panel.getByLabel('水面候选').selectOption({ index: 1 });
      // A product user can adjust an original-pixel square without JSON or offline scripts.
      await panel.getByRole('slider', { name: '草地取样范围' }).fill('128');
      await panel
        .getByRole('img', { name: '草地取样图，点击移动选区' })
        .click({ position: { x: 112, y: 120 } });
      await panel.getByRole('slider', { name: '水面取样范围' }).fill('128');
      await panel
        .getByRole('img', { name: '水面取样图，点击移动选区' })
        .click({ position: { x: 144, y: 136 } });
      await panel.getByRole('button', { name: '选择候选并构建完整 Pack' }).click();
      await browserExpect(panel.getByText(/完整 Pack 已构建/)).toBeVisible({ timeout: 30000 });
      const conversions = await running.studio.store.db.aiConversion.findMany({
        where: { projectId: project.id },
      });
      expect(conversions).toHaveLength(2);
      const descriptors = conversions.map(
        (c) =>
          c.descriptor as {
            version: string;
            rect: { x: number; y: number; width: number; height: number };
            paletteInputs: string[];
            outputPixelHashes: string[];
          },
      );
      for (const d of descriptors) {
        expect(d.version).toBe('ai-region-adaptive-source-v2');
        expect(d.paletteInputs).toHaveLength(2);
        expect(d.rect.width).toBe(128);
      }
      expect(descriptors.map((d) => d.rect).sort((a, b) => a.x - b.x)).toEqual([
        { x: 48, y: 56, width: 128, height: 128 },
        { x: 80, y: 72, width: 128, height: 128 },
      ]);
      await panel.getByLabel('补充描述（可选）').fill('soft texture, blue-green colors');
      const repairResponse = page.waitForResponse(
        (r) => r.url().endsWith('/ai/create') && r.request().method() === 'POST',
      );
      await panel.getByRole('button', { name: '局部修复水面', exact: true }).click();
      const repairResult = await repairResponse;
      expect(repairResult.status(), await repairResult.text()).toBe(202);
      await browserExpect(panel.getByLabel('水面候选').locator('option')).toHaveCount(3, {
        timeout: 15000,
      });
      await panel.getByLabel('水面候选').selectOption({ index: 1 });
      await panel.getByRole('button', { name: '选择候选并构建完整 Pack' }).click();
      await browserExpect(panel.getByText(/完整 Pack 已构建/)).toBeVisible({ timeout: 30000 });
      const s = await studio(project.id);
      expect(s.builds).toHaveLength(2);
      const select = page.getByLabel('实际构建');
      await browserExpect(select).toBeVisible();
      await select.selectOption(s.builds[1]!.id);
      await browserExpect(
        page.locator('.build-binding').filter({ hasText: `Build ${s.builds[1]!.id.slice(0, 16)}` }),
      ).toBeVisible({ timeout: 15000 });
      await select.selectOption(s.successfulBuildId!);
      const download = page.getByRole('link', { name: '下载此构建的标准 MZ 素材包 ZIP' });
      await browserExpect(download).toBeVisible({ timeout: 15000 });
      const href = await download.getAttribute('href');
      expect(href).toContain(s.successfulBuildId!);
      const detail = (await request(
        `/api/projects/${project.id}/builds/${s.successfulBuildId}/preview?scene=pond`,
      )) as { descriptor: { manifestSha: string } };
      const bytes = Buffer.from(await (await fetch(url + href)).arrayBuffer());
      const files = readStoredStandardZip(bytes);
      expect(hashBytes(files['manifest.json']!)).toBe(detail.descriptor.manifestSha);
      await page.screenshot({
        path: resolve(root, `browser-${reference ? 'reference' : 'text'}.png`),
        fullPage: true,
      });
      evidence.push({
        browser: 'chromium',
        mode: reference ? 'reference' : 'text',
        projectId: project.id,
        build: s.successfulBuildId,
        zipSha256: hashBytes(bytes),
      });
    }
    expect(pageErrors).toEqual([]);
  } finally {
    await writeFile(
      resolve(root, 'browser-state.txt'),
      await page
        .locator('body')
        .innerText()
        .catch(() => ''),
    );
    await writeFile(
      resolve(root, 'browser-network.json'),
      JSON.stringify(
        {
          network,
          occupied: (running.studio as unknown as { occupied: boolean }).occupied,
          waiting: !!(running.studio as unknown as { waiting: unknown }).waiting,
        },
        null,
        2,
      ),
    );
    await context.tracing.stop({ path: resolve(root, 'browser-trace.zip') });
    await browser.close();
  }
});
it('invalid reference/model overrides, UNKNOWN, cancellation and hard-invalid conversion preserve current success without duplicate submit', async () => {
  await running.ai.close(); // explicit deterministic fault test, no background race
  const p = await fresh('step09-failures'),
    headers = { Origin: url, 'Content-Type': 'image/png', 'X-Tileset-Client': 'local-v1' };
  const bad = await fetch(`${url}/api/projects/${p.id}/ai/reference/upload`, {
    method: 'POST',
    headers,
    body: Buffer.from('not a PNG or local path'),
  });
  expect(bad.status).toBe(422);
  const override = await fetch(`${url}/api/projects/${p.id}/ai/create`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedRevision: 0, model: 'override' }),
  });
  expect(override.status).toBe(400);
  const created = await running.ai.create(p.id, {
    expectedRevision: 0,
    supplemental: '',
    style: 'temperate-pixel',
  });
  const id = created.taskIds[0]!,
    cancelId = created.taskIds[1]!;
  const task = await running.studio.store.task(id);
  await running.studio.store.taskScope(id, async () => {
    await running.studio.store.taskIntent(id, task!.version);
    const submitting = await running.studio.store.task(id);
    await running.studio.store.recoverUnknown(id, submitting!.version);
  });
  await expect(running.ai.action(p.id, id, 'resume')).rejects.toThrow('提交状态未知');
  await running.ai.action(p.id, cancelId, 'cancel');
  await running.ai.action(p.id, cancelId, 'cancel');
  expect((await running.studio.store.task(id))!.state).toBe('SUBMISSION_UNKNOWN');
  expect((await running.studio.store.taskDetail(id)).attempts).toHaveLength(1);
  expect((await running.studio.store.task(cancelId))!.state).toBe('CANCELLED_LOCAL');
  expect((await studio(p.id)).successfulBuildId).toBeNull();
  const { AiStudioService } = await import('../../src/ai-studio-service.js');
  const live = new AiStudioService(running.studio, {
    TILESET_AI_MODE: 'wavespeed',
    TILESET_PROVIDER_ENV_FILE: '/must-not-read-real-key',
  });
  Object.defineProperty(live, 'budgetRoot', {
    value: resolve(root, 'synthetic-unapproved-budget'),
  });
  await expect(
    live.create(p.id, { expectedRevision: 0, supplemental: '', style: 'temperate-pixel' }),
  ).rejects.toThrow('预算尚未批准');
  const { Executor, Archiver } = await import('@tileset/local-executor');
  const { encodePng } = await import('@tileset/image-adapter');
  const { RgbaImage } = await import('@tileset/asset-core');
  const flatProject = await fresh('step09-flat-rejection'),
    flatTasks = await running.ai.create(flatProject.id, {
      expectedRevision: 0,
      supplemental: '',
      style: 'temperate-pixel',
    });
  const waterTask = flatTasks.taskIds[1]!;
  const data = new Uint8Array(256 * 256 * 4);
  for (let i = 0; i < data.length; i += 4) data.set([85, 85, 170, 255], i);
  const bytes = await encodePng(new RgbaImage({ width: 256, height: 256, data }));
  const executor = new Executor(
    running.studio.store,
    {
      adapterFor: () => ({
        provider: 'mock',
        adapterVersion: 'mock-provider-v1',
        submit: async () => ({ outcome: 'KNOWN', predictionId: randomUUID() }),
        query: async () => ({
          status: 'SUCCEEDED',
          outputs: [{ url: 'mock://flat/0', expiresAt: null }],
        }),
      }),
    },
    new Archiver(running.studio.store, { bytes: async () => bytes }),
  );
  await executor.resume(flatTasks.taskIds[0]!, 'WAIT');
  await executor.resume(waterTask, 'WAIT');
  await expect(
    running.ai.apply(
      flatProject.id,
      { expectedRevision: 0, grassTask: flatTasks.taskIds[0]!, waterTask },
      new AbortController().signal,
    ),
  ).rejects.toThrow('less than 1%');
  const rejected = await running.studio.store.db.aiConversion.findFirstOrThrow({
    where: { taskId: waterTask },
  });
  expect((rejected.descriptor as { status: string }).status).toBe('REJECTED');
  expect((await studio(flatProject.id)).successfulBuildId).toBeNull();
  expect((await ai(flatProject.id)).candidates.find((c) => c.id === waterTask)?.errorCode).toBe(
    'CANDIDATE_UNUSABLE',
  );
  await expect(
    running.studio.store.db.aiConversion.delete({ where: { id: rejected.id } }),
  ).rejects.toThrow('immutable history');
  evidence.push({
    negativeControls: [
      'non-PNG',
      'model override',
      'UNKNOWN no resubmit',
      'local cancel idempotent',
      'unapproved no credential read',
      'flat water conversion rejected',
      'immutable conversion',
    ],
    paidSubmissions: 0,
  });
});

it('failed publication preserves the successful build and exposes only a bounded safe backend stage observation', async () => {
  const project = await fresh('step09-publication-diagnostic');
  await request(`/api/projects/${project.id}/preset`, { family: 'art' });
  let s = await studio(project.id);
  await request(`/api/projects/${project.id}/recipe`, {
    expectedRevision: s.revision,
    sources: Object.fromEntries(s.sources.map((source) => [source.component, source.id])),
    style: 'component-palette',
  });
  s = await studio(project.id);
  const recipeId = s.recipes.find((recipe) => recipe.current)!.id;
  await request(`/api/projects/${project.id}/builds`, {
    expectedRevision: s.revision,
    recipeId,
    mode: 'update',
  });
  s = await waitBuild(project.id);
  const successfulBuild = s.successfulBuildId;
  failBeforePublish = true;
  try {
    const job = (await request(`/api/projects/${project.id}/builds`, {
      expectedRevision: s.revision,
      recipeId,
      mode: 'update',
    })) as { id: string };
    for (let i = 0; i < 80; i++) {
      s = await studio(project.id);
      if (s.jobs.find((j) => j.id === job.id)?.state === 'FAILED') break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    expect(s.jobs.find((j) => j.id === job.id)?.state).toBe('FAILED');
    expect(s.successfulBuildId).toBe(successfulBuild);
    const observation = buildFailures.find((item) => item.jobId === job.id)!;
    expect(observation).toMatchObject({
      stage: 'publish',
      code: 'BUILD_FAILED',
      exceptionType: 'Error',
    });
    expect(JSON.stringify(observation)).not.toContain('SYNTHETIC_PRIVATE_PAYLOAD');
    expect(JSON.stringify(observation)).not.toContain(process.cwd());
    expect(JSON.stringify(s)).not.toContain('SYNTHETIC_PRIVATE_PAYLOAD');
    evidence.push({ failureObservation: observation, preservedSuccessfulBuild: successfulBuild });
  } finally {
    failBeforePublish = false;
  }
});
