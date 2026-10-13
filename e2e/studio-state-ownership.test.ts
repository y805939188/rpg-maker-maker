import { test, expect, type Page } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { StudioSchema } from '../packages/contracts/dist/index.js';

const mode = process.env['E2E_MODE'] === 'dev' ? 'dev' : 'production';
const out = resolve('.local/step07/browser', mode, 'r3-state-ownership');
const api = `http://127.0.0.1:${process.env['API_PORT'] ?? 4310}`;
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
type Fixture = { id: string; name: string; historicalRecipe: string; grass: string[] };
let origin: Fixture, destination: Fixture, png: Buffer;
async function state(project: string) {
  const r = await fetch(`${api}/api/projects/${project}/studio`);
  expect(r.status).toBe(200);
  return StudioSchema.parse(await r.json());
}
async function post<T = { id: string }>(path: string, body: unknown): Promise<T> {
  const r = await fetch(api + path, {
    method: 'POST',
    headers: { Origin: api, 'X-Tileset-Client': 'local-v1', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  expect(r.ok).toBe(true);
  return r.json() as Promise<T>;
}
async function terminal(project: string, job: string) {
  let result: Awaited<ReturnType<typeof state>>['jobs'][number] | undefined;
  await expect
    .poll(
      async () => {
        result = (await state(project)).jobs.find((j) => j.id === job);
        return result?.state;
      },
      { timeout: 30000, intervals: [100] },
    )
    .toMatch(/COMPLETED|FAILED/);
  return result!;
}
async function actualImage(page: Page, project: string) {
  const image = page.getByAltText('当前配方处理水面');
  await expect(image).toHaveAttribute('data-project-id', project, { timeout: 15000 });
  await expect
    .poll(() =>
      image.evaluate((i) => [
        (i as HTMLImageElement).naturalWidth,
        (i as HTMLImageElement).naturalHeight,
      ]),
    )
    .toEqual([96, 144]);
  const recipe = (await image.getAttribute('data-recipe-id'))!,
    frame = Number(await image.getAttribute('data-source-frame'));
  const r = await fetch(
    `${api}/api/projects/${project}/recipes/${recipe}/processed?frame=${frame}`,
  );
  expect(r.status).toBe(200);
  const bytes = Buffer.from(await r.arrayBuffer()),
    expected = await sharp(bytes).ensureAlpha().raw().toBuffer();
  expect(await image.getAttribute('data-png-sha256')).toBe(sha(bytes));
  const pixels = await image.evaluate((i) => {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 144;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(i as HTMLImageElement, 0, 0);
    return [...ctx.getImageData(0, 0, 96, 144).data];
  });
  expect(Buffer.from(pixels)).toEqual(expected);
  return {
    project,
    recipe,
    frame,
    pngSha: sha(bytes),
    pixelSha: sha(expected),
    decoded: [96, 144],
  };
}
async function open(page: Page, fixture: Fixture) {
  await page.goto('/');
  await page.getByRole('button', { name: fixture.name, exact: true }).click();
  await expect(
    page.getByRole('heading', { name: fixture.name + ' · 创作素材', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('画布已就绪 · 实际导出图集', { exact: false })).toBeVisible({
    timeout: 30000,
  });
  const image = await actualImage(page, fixture.id);
  await expect(page.getByRole('button', { name: '构建当前配套', exact: true })).toBeEnabled();
  return image;
}
function capture(page: Page) {
  const log = {
    network: [] as { method?: string; status?: number; url: string; event: string }[],
    errors: [] as string[],
    console: [] as { type: string; text: string }[],
  };
  page.on('request', (r) => {
    if (r.url().includes('/api/'))
      log.network.push({ event: 'request', method: r.method(), url: r.url() });
  });
  page.on('response', (r) => {
    if (r.url().includes('/api/'))
      log.network.push({ event: 'response', status: r.status(), url: r.url() });
  });
  page.on('pageerror', (e) => log.errors.push(e.message));
  page.on('console', (m) => log.console.push({ type: m.type(), text: m.text() }));
  return log;
}
async function delayedMutation(page: Page, pattern: string) {
  let resolveEntered!: () => void, saved: { status: number; json: { id?: string } } | undefined;
  const entered = new Promise<void>((resolve) => {
    resolveEntered = resolve;
  });
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === new URL(pattern.replace('**', api)).pathname,
  );
  await page.route(pattern, async (route) => {
    const actual = await route.fetch();
    saved = { status: actual.status(), json: (await actual.json()) as { id?: string } };
    resolveEntered();
    await new Promise((resolve) => setTimeout(resolve, 1300));
    await route.fulfill({ response: actual });
  });
  return { entered, response, saved: () => saved! };
}
async function switchWhilePending(page: Page) {
  await page.getByRole('button', { name: destination.name, exact: true }).click();
  await expect(
    page.getByRole('heading', { name: destination.name + ' · 创作素材', exact: true }),
  ).toBeVisible();
  const selected = await page.locator('.components select').nth(0).inputValue(),
    recipe = await page.getByLabel('精确配方 revision').inputValue();
  expect(selected).not.toBe('');
  expect(recipe).not.toBe('');
  return { selected, recipe };
}
async function targetUnchanged(
  page: Page,
  before: Awaited<ReturnType<typeof state>>,
  selection: { selected: string; recipe: string },
) {
  expect(await page.locator('.components select').nth(0).inputValue()).toBe(selection.selected);
  expect(await page.getByLabel('精确配方 revision').inputValue()).toBe(selection.recipe);
  expect(await state(destination.id)).toEqual(before);
  expect(await page.locator('.notice').count()).toBe(0);
  expect(await page.locator('.studio-content > .alert').count()).toBe(0);
  const image = await actualImage(page, destination.id);
  await expect(
    page.getByRole('button', { name: '验证并采用固定岸线配方', exact: true }),
  ).toBeEnabled();
  return image;
}
test.beforeAll(async () => {
  await mkdir(out, { recursive: true });
  png = await readFile('tests/fixtures/art-ground.png');
  async function fixture(label: string) {
    const p = await post<{ id: string; name: string }>('/api/projects', {
      name: label + randomUUID(),
    });
    await post(`/api/projects/${p.id}/preset`, { family: 'art' });
    let s = await state(p.id);
    const sources = Object.fromEntries(
      ['grass', 'water-0', 'water-1', 'water-2', 'mask', 'overlay'].map((c) => [
        c,
        s.sources.find((a) => a.component === c)!.id,
      ]),
    );
    await post(`/api/projects/${p.id}/recipe`, {
      expectedRevision: s.revision,
      sources,
      style: 'component-palette',
    });
    s = await state(p.id);
    const historicalRecipe = s.recipes.find((r) => r.current)!.id;
    const job = await post(`/api/projects/${p.id}/builds`, {
      expectedRevision: s.revision,
      recipeId: historicalRecipe,
      mode: 'update',
    });
    expect((await terminal(p.id, job.id)).state).toBe('COMPLETED');
    const uploaded = await fetch(`${api}/api/projects/${p.id}/sources/grass/upload?density=2`, {
      method: 'POST',
      headers: { Origin: api, 'X-Tileset-Client': 'local-v1', 'Content-Type': 'image/png' },
      body: new Uint8Array(png),
    });
    expect(uploaded.status).toBe(201);
    s = await state(p.id);
    return {
      ...p,
      historicalRecipe,
      grass: s.sources.filter((a) => a.component === 'grass').map((a) => a.id),
    };
  }
  origin = await fixture('R3来源-');
  destination = await fixture('R3目标-');
  await writeFile(
    resolve(out, 'fixtures.json'),
    JSON.stringify({ origin, destination, pngSha: sha(png) }, null, 2) + '\n',
  );
});

for (const failure of ['503', '429', 'network'] as const) {
  test(`continuous ${failure} poll errors stop at five and explicit read recovers the actual completed job`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const log = capture(page),
      before = await state(origin.id);
    await open(page, origin);
    await page.clock.install();
    let inject = false,
      errors = 0,
      reads = 0,
      posts = 0;
    const pattern = `**/api/projects/${origin.id}/studio`;
    await page.route(pattern, async (route) => {
      reads++;
      if (inject) {
        errors++;
        if (failure === 'network') await route.abort('failed');
        else
          await route.fulfill({
            status: Number(failure),
            contentType: 'application/json',
            body: JSON.stringify({
              error: {
                code: failure === '429' ? 'BUSY' : 'SERVICE_UNAVAILABLE',
                message: '受控状态读取失败',
              },
            }),
          });
        return;
      }
      const r = await route.fetch(),
        s = StudioSchema.parse(await r.json());
      if (s.jobs.some((j) => j.state === 'RUNNING' || j.state === 'QUEUED')) inject = true;
      await route.fulfill({ response: r });
    });
    page.on('request', (r) => {
      if (r.method() === 'POST') posts++;
    });
    try {
      const reply = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().endsWith('/builds'),
      );
      await page.getByRole('button', { name: '构建当前配套', exact: true }).click();
      const job = (await (await reply).json()) as { id: string };
      const done = await terminal(origin.id, job.id);
      expect(done.state).toBe('COMPLETED');
      await expect(
        page.getByRole('button', { name: '只读重读项目状态', exact: true }),
      ).toBeVisible();
      // After the real five failures, advance the quiet window without rendering
      // thousands of unrelated animation frames. Any further poll still fails this control.
      await page.clock.fastForward(81000);
      await page.waitForTimeout(50);
      expect(errors).toBe(5);
      const stoppedReads = reads;
      await expect(
        page.getByRole('button', { name: '只读重读项目状态', exact: true }),
      ).toBeVisible();
      const row = page
        .getByRole('list', { name: '构建任务' })
        .getByRole('listitem')
        .filter({ hasText: job.id.slice(0, 8) });
      await expect(row).toContainText('状态未知');
      expect(
        await page.locator('canvas[aria-label="交付拼接预览"]').getAttribute('data-build-id'),
      ).toBe(before.successfulBuildId);
      await page.clock.fastForward(20000);
      await page.waitForTimeout(50);
      expect(reads).toBe(stoppedReads);
      await page.screenshot({ path: resolve(out, `poll-${failure}-stopped.png`), fullPage: true });
      inject = false;
      await page.getByRole('button', { name: '只读重读项目状态', exact: true }).click();
      await expect(row).toContainText('完成');
      expect(posts).toBe(1);
      expect(reads).toBe(stoppedReads + 1);
      expect((await state(origin.id)).successfulBuildId).toBe(done.buildId);
      await row.getByRole('button', { name: '查看这次实际构建' }).click();
      await expect(page.locator('canvas[aria-label="交付拼接预览"]')).toHaveAttribute(
        'data-build-id',
        done.buildId!,
      );
      const image = await actualImage(page, origin.id);
      await writeFile(
        resolve(out, `poll-${failure}.json`),
        JSON.stringify(
          {
            ...log,
            controlledFailure: failure,
            failedReads: errors,
            stoppedReads,
            readsAfterManual: reads,
            posts,
            backend: done,
            lastSuccessfulBefore: before.successfulBuildId,
            image,
          },
          null,
          2,
        ) + '\n',
      );
      expect(log.errors).toEqual([]);
      expect(
        log.console
          .filter((c) => c.type === 'error')
          .every((c) => c.text.includes(failure === 'network' ? 'ERR_FAILED' : failure)),
      ).toBe(true);
    } finally {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    }
  });
}

test('late real upload preserves another project and same-project explicit source choice; normal upload still works', async ({
  page,
}) => {
  test.setTimeout(120000);
  const log = capture(page),
    rows: unknown[] = [];
  await open(page, origin);
  const before = await state(destination.id);
  const path = `**/api/projects/${origin.id}/sources/grass/upload?density=2`,
    gate = await delayedMutation(page, path);
  await page
    .getByLabel('上传草地', { exact: true })
    .setInputFiles({ name: 'late-real-grass.png', mimeType: 'image/png', buffer: png });
  await gate.entered;
  const selection = await switchWhilePending(page);
  expect((await gate.response).status()).toBe(201);
  const kept = gate.saved().json.id!;
  expect((await state(origin.id)).sources.some((s) => s.id === kept)).toBe(true);
  rows.push({
    control: 'cross-project real201',
    keptSource: kept,
    selection,
    image: await targetUnchanged(page, before, selection),
  });
  await page.screenshot({ path: resolve(out, 'late-upload-target-intact.png'), fullPage: true });
  await page.unrouteAll();
  await open(page, origin);
  const same = await delayedMutation(page, path);
  await page
    .getByLabel('上传草地', { exact: true })
    .setInputFiles({ name: 'same-project-grass.png', mimeType: 'image/png', buffer: png });
  await same.entered;
  const chosen = origin.grass[origin.grass.length - 1]!;
  await page.locator('.components select').nth(0).selectOption(chosen);
  expect((await same.response).status()).toBe(201);
  await expect(page.getByLabel('上传草地', { exact: true })).toBeEnabled();
  expect(await page.locator('.components select').nth(0).inputValue()).toBe(chosen);
  expect(await page.locator('.notice').count()).toBe(0);
  rows.push({
    control: 'same-project changed choice',
    chosen,
    keptSource: same.saved().json.id,
    image: await actualImage(page, origin.id),
  });
  await page.unrouteAll();
  const normal = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().includes('/sources/grass/upload'),
  );
  await page
    .getByLabel('上传草地', { exact: true })
    .setInputFiles({ name: 'normal-real-grass.png', mimeType: 'image/png', buffer: png });
  const r = await normal;
  expect(r.status()).toBe(201);
  const saved = (await r.json()) as { id: string };
  await expect(page.locator('.components select').nth(0)).toHaveValue(saved.id);
  await expect(page.locator('.notice')).toContainText('草地新 revision 已保存');
  rows.push({ control: 'ordinary success', selected: saved.id });
  await writeFile(
    resolve(out, 'late-upload.json'),
    JSON.stringify({ ...log, rows }, null, 2) + '\n',
  );
  expect(log.errors).toEqual([]);
  expect(log.console.filter((c) => c.type === 'error')).toEqual([]);
});

test('late adoption preserves target recipe and same-project historical recipe selection', async ({
  page,
}) => {
  test.setTimeout(120000);
  const log = capture(page),
    rows: unknown[] = [];
  await open(page, origin);
  const before = await state(destination.id),
    path = `**/api/projects/${origin.id}/recipe`,
    gate = await delayedMutation(page, path);
  await page.getByRole('button', { name: '验证并采用固定岸线配方', exact: true }).click();
  await gate.entered;
  const selection = await switchWhilePending(page);
  expect((await gate.response).status()).toBe(201);
  rows.push({
    control: 'cross-project real adoption',
    selection,
    image: await targetUnchanged(page, before, selection),
  });
  await page.unrouteAll();
  await open(page, origin);
  const same = await delayedMutation(page, path);
  await page.getByRole('button', { name: '验证并采用固定岸线配方', exact: true }).click();
  await same.entered;
  await page.getByLabel('精确配方 revision').selectOption(origin.historicalRecipe);
  expect((await same.response).status()).toBe(201);
  await expect(
    page.getByRole('button', { name: '验证并采用固定岸线配方', exact: true }),
  ).toBeEnabled();
  expect(await page.getByLabel('精确配方 revision').inputValue()).toBe(origin.historicalRecipe);
  expect(await page.locator('.notice').count()).toBe(0);
  const image = await actualImage(page, origin.id);
  expect(image.recipe).toBe(origin.historicalRecipe);
  rows.push({ control: 'same-project historical choice', image });
  await page.screenshot({
    path: resolve(out, 'late-adoption-historical-intact.png'),
    fullPage: true,
  });
  await writeFile(
    resolve(out, 'late-adoption.json'),
    JSON.stringify({ ...log, rows }, null, 2) + '\n',
  );
  expect(log.errors).toEqual([]);
  expect(log.console.filter((c) => c.type === 'error')).toEqual([]);
  await page.unrouteAll();
});

test('late error, accepted build, visual repair record and created project cannot write another project UI', async ({
  page,
}) => {
  test.setTimeout(180000);
  const log = capture(page),
    rows: unknown[] = [];
  for (const operation of ['error', 'build', 'visual', 'create'] as const) {
    await open(page, origin);
    const before = await state(destination.id),
      current = await state(origin.id);
    const path =
      operation === 'error'
        ? `**/api/projects/${origin.id}/sources/grass/upload?density=2`
        : operation === 'build'
          ? `**/api/projects/${origin.id}/builds`
          : operation === 'visual'
            ? `**/api/projects/${origin.id}/builds/${current.successfulBuildId}/visual`
            : '**/api/projects';
    const gate = await delayedMutation(page, path);
    let createdName = '';
    if (operation === 'error')
      await page.getByLabel('上传草地', { exact: true }).setInputFiles({
        name: 'invalid.png',
        mimeType: 'image/png',
        buffer: Buffer.from('bad PNG'),
      });
    if (operation === 'build')
      await page.getByRole('button', { name: '构建当前配套', exact: true }).click();
    if (operation === 'visual')
      await page.getByRole('button', { name: '视觉需修复', exact: true }).click();
    if (operation === 'create') {
      createdName = 'R3迟到创建-' + randomUUID();
      await page.getByLabel('项目名称', { exact: true }).fill(createdName);
      await page.getByRole('button', { name: '创建项目', exact: true }).click();
    }
    await gate.entered;
    const selection = await switchWhilePending(page),
      response = await gate.response;
    expect(response.status()).toBe(
      operation === 'error'
        ? 422
        : operation === 'build'
          ? 202
          : operation === 'create'
            ? 201
            : 200,
    );
    // Verify the late write cannot change selection before awaiting actual work.
    expect(await page.locator('.components select').nth(0).inputValue()).toBe(selection.selected);
    expect(await page.getByLabel('精确配方 revision').inputValue()).toBe(selection.recipe);
    expect(await page.locator('.notice').count()).toBe(0);
    if (operation === 'build')
      expect((await terminal(origin.id, gate.saved().json.id!)).state).toBe('COMPLETED');
    const image = await targetUnchanged(page, before, selection);
    if (operation === 'create') {
      const projects = (await (await fetch(api + '/api/projects')).json()) as {
        projects: { id: string; name: string }[];
      };
      expect(
        projects.projects.some((p) => p.id === gate.saved().json.id && p.name === createdName),
      ).toBe(true);
    }
    rows.push({
      operation,
      saved: gate.saved(),
      selection,
      image,
      serverCommitRetained: operation !== 'error',
    });
    await page.unrouteAll();
  }
  await page.screenshot({ path: resolve(out, 'late-actions-target-intact.png'), fullPage: true });
  await writeFile(
    resolve(out, 'late-actions.json'),
    JSON.stringify({ ...log, rows }, null, 2) + '\n',
  );
  expect(log.errors).toEqual([]);
  expect(log.console.filter((c) => c.type === 'error').every((c) => c.text.includes('422'))).toBe(
    true,
  );
});
