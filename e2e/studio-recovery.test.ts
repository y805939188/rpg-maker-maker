import { test, expect, type Page } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { Persistence, resolveAssetRoot } from '@tileset/persistence';
import type { Resources } from '../apps/api/src/studio-service.js';
import { loadE2EEnvironment } from './environment.js';

const mode = process.env['E2E_MODE'] === 'dev' ? 'dev' : 'production';
const out = resolve('.local/step07/browser', mode, 'r2-recovery');
const api = `http://127.0.0.1:${process.env['API_PORT'] ?? 4310}`;
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
type Fixture = { id: string; name: string; build: string; recipe: string };
let modern: Fixture, legacy: Fixture;
async function get(path: string) {
  const r = await fetch(api + path);
  expect(r.status).toBe(200);
  return r.json();
}
async function post(path: string, body: unknown) {
  const r = await fetch(api + path, {
    method: 'POST',
    headers: { Origin: api, 'X-Tileset-Client': 'local-v1', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  expect(r.ok).toBe(true);
  return r.json();
}
async function terminal(project: string, job: string) {
  let actual: { id: string; state: string; buildId: string | null } | undefined;
  await expect
    .poll(
      async () => {
        const s = await get(`/api/projects/${project}/studio`);
        actual = s.jobs.find((j: { id: string }) => j.id === job);
        return actual?.state;
      },
      { timeout: 30000, intervals: [100] },
    )
    .toMatch(/COMPLETED|FAILED/);
  return actual!;
}
async function canvasReady(page: Page, build: string) {
  await expect(page.locator('canvas[aria-label="交付拼接预览"]')).toHaveAttribute(
    'data-build-id',
    build,
    { timeout: 30000 },
  );
  await expect(page.getByText('画布已就绪 · 实际导出图集', { exact: false })).toBeVisible();
}
async function imageReady(page: Page, project: string, recipe: string, frame = 0) {
  const image = page.getByAltText('当前配方处理水面');
  await expect(image).toHaveAttribute('data-project-id', project, { timeout: 15000 });
  await expect(image).toHaveAttribute('data-recipe-id', recipe);
  await expect(image).toHaveAttribute('data-source-frame', String(frame));
  await expect
    .poll(() =>
      image.evaluate((i) => [
        (i as HTMLImageElement).naturalWidth,
        (i as HTMLImageElement).naturalHeight,
      ]),
    )
    .toEqual([96, 144]);
  const pngResponse = await fetch(
    `${api}/api/projects/${project}/recipes/${recipe}/processed?frame=${frame}`,
  );
  expect(pngResponse.status).toBe(200);
  expect(pngResponse.headers.get('content-type')).toContain('image/png');
  const png = Buffer.from(await pngResponse.arrayBuffer());
  expect(await image.getAttribute('data-png-sha256')).toBe(sha(png));
  const expected = await sharp(png).ensureAlpha().raw().toBuffer();
  const actual = await image.evaluate((i) => {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 144;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(i as HTMLImageElement, 0, 0);
    return [...ctx.getImageData(0, 0, 96, 144).data];
  });
  expect(Buffer.from(actual)).toEqual(expected);
  return { project, recipe, frame, pngSha: sha(png), pixelSha: sha(expected), bytes: png.length };
}
function capture(page: Page) {
  const log = {
    requests: [] as { method: string; url: string }[],
    responses: [] as { url: string; status: number }[],
    errors: [] as string[],
    console: [] as { type: string; text: string }[],
  };
  page.on('request', (r) => {
    if (r.url().includes('/api/')) log.requests.push({ method: r.method(), url: r.url() });
  });
  page.on('response', (r) => {
    if (r.url().includes('/api/')) log.responses.push({ url: r.url(), status: r.status() });
  });
  page.on('pageerror', (e) => log.errors.push(e.message));
  page.on('console', (m) => log.console.push({ type: m.type(), text: m.text() }));
  return log;
}
test.beforeAll(async () => {
  const environment = loadE2EEnvironment();
  await mkdir(out, { recursive: true });
  const resources = JSON.parse(
    await readFile('apps/api/dist/resources/studio.json', 'utf8'),
  ) as Resources;
  const p = await post('/api/projects', { name: 'R2慢轮询-' + randomUUID() });
  await post(`/api/projects/${p.id}/preset`, { family: 'art' });
  const s = await get(`/api/projects/${p.id}/studio`);
  const sources = Object.fromEntries(
    ['grass', 'water-0', 'water-1', 'water-2', 'mask', 'overlay'].map((c) => [
      c,
      s.sources.find((r: { component: string }) => r.component === c).id,
    ]),
  );
  await post(`/api/projects/${p.id}/recipe`, {
    expectedRevision: s.revision,
    sources,
    style: 'component-palette',
  });
  const ready = await get(`/api/projects/${p.id}/studio`),
    recipe = ready.recipes.find((r: { current: boolean }) => r.current).id;
  const j = await post(`/api/projects/${p.id}/builds`, {
    expectedRevision: ready.revision,
    recipeId: recipe,
    mode: 'update',
  });
  const done = await terminal(p.id, j.id);
  expect(done.state).toBe('COMPLETED');
  modern = { ...p, build: done.buildId!, recipe };
  const store = new Persistence(
    environment.DATABASE_URL,
    await resolveAssetRoot(process.env),
    resources.profile,
  );
  try {
    const p = await store.createProject('R2旧06资源-' + randomUUID()),
      saved = await store.saveArchives(p.id, [resources.presets.art]),
      row = saved.records[0]!,
      snapshot = await store.adopt(p.id, 0, row.built.ir.dependencies),
      pack = await store.createPack(p.id, 'resource-legacy');
    const built = await store.publish(
      await store.prepareBuild(
        p.id,
        pack.id,
        snapshot.id,
        [
          {
            operation: 'put',
            logicalId: 'legacy-grass',
            revision: 1,
            fragmentHash: row.ground.contentHash,
            groundId: null,
          },
          {
            operation: 'put',
            logicalId: 'legacy-water',
            revision: 1,
            fragmentHash: row.water.contentHash,
            groundId: 'legacy-grass',
          },
        ],
        resources.context,
      ),
    );
    const s = await get(`/api/projects/${p.id}/studio`);
    legacy = { ...p, build: built.id, recipe: s.recipes[0].id };
  } finally {
    await store.close();
  }
  await writeFile(
    resolve(out, 'fixtures.json'),
    JSON.stringify({ sourceContext: resources.context, modern, legacy }, null, 2) + '\n',
  );
});

test('1300ms legal poll responses deliver success and failure, fast controls and late old projects stay correct', async ({
  page,
}) => {
  test.setTimeout(180000);
  const log = capture(page);
  const samples: unknown[] = [];
  let active = 0,
    maximum = 0,
    delayed = true;
  const path = `**/api/projects/${modern.id}/studio`;
  try {
    await page.goto('/');
    await page.getByRole('button', { name: modern.name, exact: true }).click();
    await canvasReady(page, modern.build);
    await imageReady(page, modern.id, modern.recipe);
    await page.route(path, async (route) => {
      active++;
      maximum = Math.max(maximum, active);
      try {
        const response = await route.fetch();
        const data = await response.json();
        if (delayed) await new Promise((r) => setTimeout(r, 1300));
        samples.push({
          jobs: data.jobs,
          current: data.successfulBuildId,
          delayMs: delayed ? 1300 : 0,
        });
        await route.fulfill({ response }).catch(() => {});
      } finally {
        active--;
      }
    });
    for (const expected of ['COMPLETED', 'FAILED']) {
      await expect(
        page.getByRole('button', { name: '退役旧组并建立第二组', exact: true }),
      ).toBeEnabled();
      const wait = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().endsWith('/builds'),
      );
      await page.getByRole('button', { name: '退役旧组并建立第二组', exact: true }).click();
      const job = await (await wait).json();
      const actual = await terminal(modern.id, job.id);
      expect(actual.state).toBe(expected);
      const item = page
        .getByRole('list', { name: '构建任务' })
        .getByRole('listitem')
        .filter({ hasText: job.id.slice(0, 8) });
      await expect(item).toContainText(expected === 'COMPLETED' ? '完成' : '失败', {
        timeout: 15000,
      });
      await expect(page.getByRole('button', { name: '构建当前配套', exact: true })).toBeEnabled();
      if (actual.buildId) {
        modern.build = actual.buildId;
        await item.getByRole('button', { name: '查看这次实际构建' }).click();
        await canvasReady(page, modern.build);
        await imageReady(page, modern.id, modern.recipe);
      } else
        await expect(page.locator('canvas[aria-label="交付拼接预览"]')).toHaveAttribute(
          'data-build-id',
          modern.build,
        );
      await page.screenshot({ path: resolve(out, `slow-poll-${expected}.png`), fullPage: true });
    }
    expect(maximum).toBe(1);
    delayed = false;
    const wait = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().endsWith('/builds'),
    );
    await page.getByRole('button', { name: '构建当前配套', exact: true }).click();
    const job = await (await wait).json();
    const done = await terminal(modern.id, job.id);
    const item = page
      .getByRole('list', { name: '构建任务' })
      .getByRole('listitem')
      .filter({ hasText: job.id.slice(0, 8) });
    await expect(item).toContainText('完成');
    expect(done.state).toBe('COMPLETED');
    modern.build = done.buildId!;
    // A real old-project response held after reading must not replace the new project's state.
    delayed = true;
    const pending = page.waitForRequest((r) => r.url().endsWith(`/projects/${modern.id}/studio`));
    const postWait = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().endsWith('/builds'),
    );
    await page.getByRole('button', { name: '构建当前配套', exact: true }).click();
    await postWait;
    await pending;
    await page.getByRole('button', { name: legacy.name, exact: true }).click();
    await canvasReady(page, legacy.build);
    const image = await imageReady(page, legacy.id, legacy.recipe);
    await page.waitForTimeout(1600);
    await expect(page.getByRole('heading', { name: legacy.name + ' · 创作素材' })).toBeVisible();
    await expect(page.getByAltText('当前配方处理水面')).toHaveAttribute(
      'data-project-id',
      legacy.id,
    );
    samples.push({ lateOldProjectControl: image });
    expect(log.errors).toEqual([]);
  } finally {
    await page.unroute(path);
    await writeFile(
      resolve(out, 'poll.json'),
      JSON.stringify({ ...log, delayMs: 1300, maximumInFlight: maximum, samples }, null, 2) + '\n',
    );
  }
});

test('three ordinary switches cancel unfinished processed work and display real decoded current PNG', async ({
  browser,
}) => {
  test.setTimeout(180000);
  const rows: unknown[] = [];
  for (let index = 0; index < 3; index++) {
    const context = await browser.newContext(),
      page = await context.newPage();
    const log = capture(page);
    try {
      await page.goto('/');
      const s = await get(`/api/projects/${modern.id}/studio`);
      modern.build = s.successfulBuildId;
      const pending = page.waitForRequest((r) =>
        r.url().includes(`/projects/${legacy.id}/recipes/${legacy.recipe}/processed?frame=0`),
      );
      await page.getByRole('button', { name: legacy.name, exact: true }).click();
      await canvasReady(page, legacy.build);
      await pending;
      const oldPending = !log.responses.some(
        (r) =>
          r.url.includes(`/projects/${legacy.id}/recipes/${legacy.recipe}/processed?frame=0`) &&
          r.status === 200,
      );
      expect(oldPending).toBe(true);
      await page.getByRole('button', { name: modern.name, exact: true }).click();
      await canvasReady(page, modern.build);
      const image = await imageReady(page, modern.id, modern.recipe);
      await page.getByLabel('创作源水面状态').selectOption('1');
      const frame1 = await imageReady(page, modern.id, modern.recipe, 1);
      await page.getByLabel('创作源水面状态').selectOption('2');
      const frame2 = await imageReady(page, modern.id, modern.recipe, 2);
      await page.screenshot({ path: resolve(out, `ordinary-switch-${index}.png`), fullPage: true });
      expect(log.responses.filter((r) => r.status >= 400)).toEqual([]);
      expect(log.errors).toEqual([]);
      expect(log.console.filter((r) => r.type === 'error')).toEqual([]);
      rows.push({ networkInjection: false, oldPending, image, frame1, frame2, ...log });
    } finally {
      await context.close();
    }
  }
  await writeFile(resolve(out, 'ordinary-switch.json'), JSON.stringify({ rows }, null, 2) + '\n');
});

test('real bounded BUSY pressure recovers or reports failure, explicit reread and cancelled-frame download stay valid', async ({
  page,
}) => {
  test.setTimeout(180000);
  const log = capture(page);
  const s = await get(`/api/projects/${modern.id}/studio`);
  modern.build = s.successfulBuildId;
  try {
    await page.goto('/');
    await page.getByRole('button', { name: modern.name, exact: true }).click();
    await canvasReady(page, modern.build);
    await imageReady(page, modern.id, modern.recipe);
    const preview = `${api}/api/projects/${modern.id}/builds/${modern.build}/preview?scene=large`;
    const first = fetch(preview);
    await page.waitForTimeout(100);
    const second = fetch(preview);
    await page.waitForTimeout(100);
    await page.getByLabel('创作源水面状态').selectOption('1');
    const results = await Promise.all([first, second]);
    for (const r of results) {
      expect(r.status).toBe(200);
      await r.arrayBuffer();
    }
    await expect
      .poll(
        async () =>
          (await page.getByRole('button', { name: '重读处理预览', exact: true }).count()) > 0 ||
          (await page.getByAltText('当前配方处理水面').getAttribute('data-source-frame')) === '1',
        { timeout: 15000 },
      )
      .toBe(true);
    const attempts = log.requests.filter((r) =>
      r.url.endsWith(`/recipes/${modern.recipe}/processed?frame=1`),
    );
    expect(attempts.length).toBeLessThanOrEqual(5);
    expect(log.responses.some((r) => r.status === 429 && r.url.includes('/processed?'))).toBe(true);
    if (await page.getByRole('button', { name: '重读处理预览', exact: true }).count())
      await page.getByRole('button', { name: '重读处理预览', exact: true }).click();
    const image = await imageReady(page, modern.id, modern.recipe, 1);
    const pending = page.waitForRequest((r) =>
      r.url().endsWith(`/recipes/${modern.recipe}/processed?frame=2`),
    );
    await page.getByLabel('创作源水面状态').selectOption('2');
    await pending;
    // Closing the view cancels its current read; the next real request is the selected successful ZIP.
    await page.goto('about:blank');
    const response = await fetch(
      `${api}/api/projects/${modern.id}/builds/${modern.build}/download`,
    );
    expect(response.status).toBe(200);
    const zip = new Uint8Array(await response.arrayBuffer());
    expect(sha(zip)).toBe(response.headers.get('x-content-sha256'));
    await writeFile(
      resolve(out, 'pressure.json'),
      JSON.stringify(
        {
          ...log,
          attemptsBeforeExplicitReread: attempts.length,
          recoveredImage: image,
          cancelledFrame: 2,
          downloadBuild: modern.build,
          zipSha: sha(zip),
          policy: 'Real 429 diagnostics recorded, finite recovery; no server/native budget change.',
        },
        null,
        2,
      ) + '\n',
    );
    expect(log.errors).toEqual([]);
  } finally {
    await writeFile(resolve(out, 'pressure-network.json'), JSON.stringify(log, null, 2) + '\n');
  }
});

test('invalid PNG and timed-out reads report errors, preserve last decoded frame and allow bounded explicit recovery', async ({
  page,
}) => {
  test.setTimeout(90000);
  const log = capture(page),
    s = await get(`/api/projects/${modern.id}/studio`);
  modern.build = s.successfulBuildId;
  const pattern = `**/api/projects/${modern.id}/recipes/${modern.recipe}/processed?frame=1`;
  try {
    await page.goto('/');
    await page.getByRole('button', { name: modern.name, exact: true }).click();
    await canvasReady(page, modern.build);
    const before = await imageReady(page, modern.id, modern.recipe);
    await page.route(pattern, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: 'not a PNG' }),
    );
    await page.getByLabel('创作源水面状态').selectOption('1');
    await expect(page.getByRole('alert').filter({ hasText: '有效PNG' })).toBeVisible();
    await expect(page.getByAltText('当前配方处理水面')).toHaveAttribute('data-source-frame', '0');
    await expect(page.getByAltText('当前配方处理水面')).toHaveAttribute(
      'data-png-sha256',
      before.pngSha,
    );
    await page.unroute(pattern);
    await page.getByRole('button', { name: '重读处理预览', exact: true }).click();
    const recovered = await imageReady(page, modern.id, modern.recipe, 1);
    const timed = `**/api/projects/${modern.id}/recipes/${modern.recipe}/processed?frame=2`;
    await page.route(timed, (route) =>
      route.fulfill({
        status: 408,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'TIMEOUT', message: '请求处理超过时间预算。' } }),
      }),
    );
    await page.getByLabel('创作源水面状态').selectOption('2');
    await expect(page.getByRole('alert').filter({ hasText: '时间预算' })).toBeVisible();
    await expect(page.getByAltText('当前配方处理水面')).toHaveAttribute('data-source-frame', '1');
    expect(log.requests.filter((r) => r.url.endsWith('/processed?frame=2'))).toHaveLength(1);
    await page.unroute(timed);
    await page.getByRole('button', { name: '重读处理预览', exact: true }).click();
    const last = await imageReady(page, modern.id, modern.recipe, 2);
    await page.screenshot({ path: resolve(out, 'failed-resource-recovered.png'), fullPage: true });
    await writeFile(
      resolve(out, 'invalid-and-timeout.json'),
      JSON.stringify(
        {
          ...log,
          controlledResponses: ['invalid PNG 200', 'TIMEOUT 408'],
          actualBefore: before,
          actualRecovered: recovered,
          actualFinal: last,
        },
        null,
        2,
      ) + '\n',
    );
    expect(log.errors).toEqual([]);
  } finally {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});
