import { test, expect, type Page } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { loadNativeOracle, nativeRects } from '../scripts/mz-oracle.js';
import { Persistence, resolveAssetRoot } from '@tileset/persistence';
import type { Resources } from '../apps/api/src/studio-service.js';
import { loadE2EEnvironment } from './environment.js';
const mode = process.env['E2E_MODE'] === 'dev' ? 'dev' : 'production';
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
const screenshotRoot = resolve('.local/step07/browser', mode);
async function canvasPixels(page: Page) {
  const encoded = await page
    .locator('canvas[aria-label="交付拼接预览"]')
    .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL('image/png').split(',')[1]!);
  return sharp(Buffer.from(encoded, 'base64'))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}
// Independently authored scene IDs and quarter coordinates, retained MZ notation.
const shapes: Record<number, readonly number[]> = {
  0: [18, 17, 14, 13],
  16: [16, 17, 12, 13],
  20: [10, 9, 14, 13],
  24: [18, 19, 14, 15],
  28: [18, 17, 22, 21],
  34: [8, 9, 12, 13],
  36: [10, 11, 14, 15],
  38: [18, 19, 22, 23],
  40: [16, 17, 20, 21],
  46: [8, 11, 20, 23],
};
async function reference(scene: 'isolated' | 'edges', frame: number) {
  const ground = await sharp('tests/fixtures/art-ground.png').ensureAlpha().raw().toBuffer(),
    water = await sharp(`tests/fixtures/art-water-${frame}.png`).ensureAlpha().raw().toBuffer();
  const grid =
    scene === 'isolated'
      ? [
          [null, null, null, null, null, null, null],
          [null, null, null, 46, null, null, null],
          [null, null, null, null, null, null, null],
        ]
      : [
          [null, null, null, null, null, null, null],
          [null, 34, 20, 20, 20, 36, null],
          [null, 16, 0, 0, 0, 24, null],
          [null, 40, 28, 28, 28, 38, null],
          [null, null, null, null, null, null, null],
        ];
  const width = 7 * 48,
    height = grid.length * 48,
    out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < grid.length; y++)
    for (let x = 0; x < 7; x++) {
      const shape = grid[y]![x],
        source = shape === null ? ground : water;
      for (const [i, q] of shapes[shape ?? 0]!.entries())
        for (let row = 0; row < 24; row++) {
          const sx = (q % 4) * 24,
            sy = Math.floor(q / 4) * 24 + row,
            dx = x * 48 + (i % 2) * 24,
            dy = y * 48 + Math.floor(i / 2) * 24 + row;
          source.copy(out, (dy * width + dx) * 4, (sy * 96 + sx) * 4, (sy * 96 + sx + 24) * 4);
        }
    }
  return { data: out, width, height };
}
async function ready(page: Page) {
  const selected = await page.getByLabel('实际构建').inputValue(),
    scene = await page.getByLabel('检查场景').inputValue();
  const canvas = page.locator('canvas[aria-label="交付拼接预览"]');
  await expect(canvas).toHaveAttribute('data-build-id', selected, { timeout: 30000 });
  await expect(canvas).toHaveAttribute('data-scene', scene);
  await expect(page.getByText('画布已就绪 · 实际导出图集', { exact: false })).toBeVisible({
    timeout: 30000,
  });
}

async function adopt(page: Page) {
  await page.getByRole('button', { name: '验证并采用固定岸线配方' }).click();
  await expect(page.getByText('固定岸线配方已验证并采用', { exact: false })).toBeVisible();
  await expect
    .poll(async () =>
      page
        .getByAltText('当前配方处理水面')
        .evaluate(
          (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth === 96,
        ),
    )
    .toBe(true);
}
async function build(page: Page, retire = false) {
  const response = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/builds'),
  );
  await page
    .getByRole('button', { name: retire ? '退役旧组并建立第二组' : '构建当前配套', exact: true })
    .click();
  const submitted = await response;
  expect(submitted.status()).toBe(202);
  const job = (await submitted.json()) as { id: string };
  const item = page
    .getByRole('list', { name: '构建任务' })
    .getByRole('listitem')
    .filter({ hasText: job.id.slice(0, 8) });
  await expect(item).toContainText('完成', { timeout: 60000 });
  await item.getByRole('button', { name: '查看这次实际构建' }).click();
  await ready(page);
  return page.locator('canvas[aria-label="交付拼接预览"]').getAttribute('data-build-id');
}

function unzipStored(zip: Buffer) {
  const members: Record<string, Buffer> = {};
  let at = 0;
  while (zip.readUInt32LE(at) === 0x04034b50) {
    const length = zip.readUInt32LE(at + 18),
      nameLength = zip.readUInt16LE(at + 26),
      extra = zip.readUInt16LE(at + 28),
      start = at + 30 + nameLength + extra;
    expect(zip.readUInt16LE(at + 8)).toBe(0);
    members[zip.subarray(at + 30, at + 30 + nameLength).toString()] = zip.subarray(
      start,
      start + length,
    );
    at = start + length;
  }
  return members;
}
test('deployed manual Studio uses real sources, revisions, exports, canvas pixels, clock, history and ZIP', async ({
  page,
}) => {
  test.setTimeout(240000);
  await mkdir(screenshotRoot, { recursive: true });
  const errors: string[] = [],
    consoleMessages: { type: string; text: string }[] = [],
    network: { url: string; status: number }[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => consoleMessages.push({ type: m.type(), text: m.text() }));
  page.on('response', (r) => {
    if (r.url().includes('/api/')) network.push({ url: r.url(), status: r.status() });
  });
  const resources = JSON.parse(await readFile('apps/api/dist/resources/studio.json', 'utf8')) as {
    presets: { art: { sources: { png: string }[] } };
  };
  const name = `Studio-${mode}-${randomUUID().slice(0, 8)}`;
  await page.goto('/');
  await page.getByLabel('项目名称', { exact: true }).fill(name);
  await page.getByRole('button', { name: '创建项目', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: name })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: name + ' · 创作素材' })).toBeVisible();
  await page
    .getByLabel('上传草地', { exact: true })
    .setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('fake PNG') });
  await expect(page.getByRole('alert')).toContainText('PNG');
  await page.screenshot({
    path: resolve(screenshotRoot, '01-upload-diagnostic.png'),
    fullPage: true,
  });
  await page.getByLabel('上传草地', { exact: true }).setInputFiles('tests/fixtures/art-ground.png');
  await expect(page.getByText('草地新 revision 已保存', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '导入原创美术样例', exact: true }).click();
  await expect(page.getByText('原创美术组件已保存', { exact: false })).toBeVisible();
  const creative = page.locator('canvas[aria-label="创作源水面动画"]');
  await expect(creative).toBeVisible();
  const creativeData = await creative.evaluate(
    (canvas) => (canvas as HTMLCanvasElement).toDataURL('image/png').split(',')[1]!,
  );
  const creativeActual = await sharp(Buffer.from(creativeData, 'base64'))
      .ensureAlpha()
      .raw()
      .toBuffer(),
    creativeExpected = await sharp(Buffer.from(resources.presets.art.sources[1]!.png, 'base64'))
      .resize(192, 288, { kernel: 'nearest' })
      .ensureAlpha()
      .raw()
      .toBuffer();
  expect(creativeActual.equals(creativeExpected)).toBe(true);
  await creative.screenshot({ path: resolve(screenshotRoot, '01-creative-source-pixi.png') });
  await page.getByRole('button', { name: '下一源播放状态', exact: true }).click();
  await page.getByRole('button', { name: '播放源水面', exact: true }).click();
  await page.waitForTimeout(550);
  await page.getByRole('button', { name: '暂停源水面', exact: true }).click();
  await adopt(page);
  const first = await build(page);
  expect(first).toMatch(/^[a-f0-9]{64}$/);
  const pixelChecks: unknown[] = [];
  for (const scene of ['isolated', 'edges'] as const) {
    await page.getByLabel('检查场景').selectOption(scene);
    await ready(page);
    for (const [state, frame] of [0, 1, 2, 1].entries()) {
      await page
        .getByRole('button', { name: `状态 ${state} · 源帧 ${frame}`, exact: true })
        .click();
      const actual = await canvasPixels(page),
        expected = await reference(scene, frame);
      expect(actual.info.width).toBe(expected.width);
      expect(actual.info.height).toBe(expected.height);
      expect(actual.data.equals(expected.data), `${scene} state${state} reference pixels`).toBe(
        true,
      );
      await page
        .locator('canvas[aria-label="交付拼接预览"]')
        .screenshot({ path: resolve(screenshotRoot, `actual-canvas-${scene}-${state}.png`) });
      pixelChecks.push({
        scene,
        state,
        sourceFrame: frame,
        actualSha: sha(actual.data),
        independentReferenceSha: sha(expected.data),
      });
      await writeFile(
        resolve(screenshotRoot, `reference-${scene}-${state}.png`),
        await sharp(expected.data, {
          raw: { width: expected.width, height: expected.height, channels: 4 },
        })
          .png()
          .toBuffer(),
      );
    }
    await page.screenshot({
      path: resolve(screenshotRoot, `02-${scene}-delivery.png`),
      fullPage: true,
    });
  }
  for (const scene of ['holes', 'channel', 'pond', 'large']) {
    await page.getByLabel('检查场景').selectOption(scene);
    await ready(page);
    await page.screenshot({ path: resolve(screenshotRoot, `03-${scene}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: '状态 0 · 源帧 0', exact: true }).click();
  await page.getByRole('button', { name: '播放', exact: true }).click();
  const canvas = page.locator('canvas[aria-label="交付拼接预览"]');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-updates')))
    .toBeGreaterThan(30);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.waitForTimeout(40);
  const paused = await canvas.getAttribute('data-updates');
  await page.waitForTimeout(650);
  expect(await canvas.getAttribute('data-updates')).toBe(paused);
  const before = Number(await canvas.getAttribute('data-state'));
  await page.getByRole('button', { name: '下一播放状态', exact: true }).click();
  expect(Number(await canvas.getAttribute('data-state'))).toBe((before + 1) % 4);
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: '下载此构建的标准 MZ 素材包 ZIP' }).click();
  const dl = await download,
    zipPath = resolve(screenshotRoot, 'first-export.zip');
  await dl.saveAs(zipPath);
  const zip = await readFile(zipPath),
    members = unzipStored(zip);
  expect(Object.keys(members).sort()).toEqual(
    [
      'A1.png',
      'A2.png',
      'INSTALL.md',
      'history.json',
      'layout.json',
      'manifest.json',
      'pack.json',
      'sources.json',
    ].sort(),
  );
  const manifest = JSON.parse(members['manifest.json']!.toString()) as {
    buildId: string;
    identity: {
      files: Record<string, { sha256: string }>;
      profileHash: string;
      profile: unknown;
      context: { commit: string };
    };
  };
  for (const [n, f] of Object.entries(manifest.identity.files))
    expect(sha(members[n]!)).toBe(f.sha256);
  expect(manifest.identity.profileHash).toBe(
    '48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793',
  );
  expect(await canvas.getAttribute('data-export-id')).toBe(manifest.buildId);
  // One real component replacement preserves its logical ID and creates a new revision.
  await page.getByLabel('上传水面源帧 0', { exact: true }).setInputFiles({
    name: 'replacement-water.png',
    mimeType: 'image/png',
    buffer: Buffer.from(resources.presets.art.sources[2]!.png, 'base64'),
  });
  await expect(page.getByText('水面源帧 0新 revision 已保存', { exact: false })).toBeVisible();
  await adopt(page);
  const second = await build(page);
  expect(second).not.toBe(first);
  expect(network.some((r) => r.url.includes(`/builds/${second}/files/A1.png`))).toBe(true);
  const nextDownload = page.waitForEvent('download');
  await page.getByRole('link', { name: '下载此构建的标准 MZ 素材包 ZIP' }).click();
  const nextDl = await nextDownload,
    nextPath = resolve(screenshotRoot, 'second-export.zip');
  await nextDl.saveAs(nextPath);
  const secondMembers = unzipStored(await readFile(nextPath));
  expect(sha(secondMembers['A1.png']!)).not.toBe(sha(members['A1.png']!));
  await page.getByLabel('实际构建').selectOption(first!);
  await ready(page);
  const oldDlEvent = page.waitForEvent('download');
  await page.getByRole('link', { name: '下载此构建的标准 MZ 素材包 ZIP' }).click();
  const oldDl = await oldDlEvent,
    oldPath = resolve(screenshotRoot, 'history-export.zip');
  await oldDl.saveAs(oldPath);
  expect(await readFile(oldPath)).toEqual(zip);
  await page.screenshot({ path: resolve(screenshotRoot, '04-history.png'), fullPage: true });
  await page.getByLabel('实际构建').selectOption(second!);
  await ready(page);
  const retired = await build(page, true);
  await page.getByLabel('素材组').selectOption('first-water');
  await ready(page);
  await page.screenshot({ path: resolve(screenshotRoot, '05-retired.png'), fullPage: true });
  const failureResponse = page.waitForResponse(
    (r) => r.url().endsWith('/builds') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: '退役旧组并建立第二组', exact: true }).click();
  const failedJob = (await (await failureResponse).json()) as { id: string };
  const failedItem = page
    .getByRole('list', { name: '构建任务' })
    .getByRole('listitem')
    .filter({ hasText: failedJob.id.slice(0, 8) });
  await expect(failedItem).toContainText('失败', { timeout: 60000 });
  await expect(failedItem).toContainText('槽位');
  expect(await canvas.getAttribute('data-build-id')).toBe(retired);
  await page.screenshot({
    path: resolve(screenshotRoot, '05-failed-build-keeps-success.png'),
    fullPage: true,
  });
  const projectId = await page.evaluate(() => localStorage.getItem('studio-project'));
  await page.reload();
  await expect(page.getByRole('heading', { name: name + ' · 创作素材' })).toBeVisible();
  await ready(page);
  expect(await canvas.getAttribute('data-build-id')).toBe(retired);
  await page.screenshot({
    path: resolve(screenshotRoot, '06-current-reloaded.png'),
    fullPage: true,
  });
  // Optional local pinned native-core check augments the CI-portable independent masters.
  let native = 'NOT_EXECUTED_NO_LOCAL_CORE';
  const core = process.env['MZ_CORE_PATH'];
  if (core) {
    const oracle = await loadNativeOracle(core);
    const descriptorResponse = await page.request.get(
      `/api/projects/${projectId}/builds/${first}/preview?scene=edges`,
    );
    const descriptor = (await descriptorResponse.json()).descriptor;
    for (let state = 0; state < 4; state++)
      for (const tile of descriptor.states[state]) {
        const rects = nativeRects(oracle, Math.floor((tile.tileId - 2048) / 48), tile.shape, state);
        for (const [i, r] of tile.rects.entries()) {
          expect([r.sx, r.sy, r.width, r.height]).toEqual([
            rects[i]!.sx,
            rects[i]!.sy,
            rects[i]!.w,
            rects[i]!.h,
          ]);
        }
      }
    native = 'PINNED_NATIVE_CORE_RECTANGLES_PASS';
  }
  await writeFile(
    resolve(screenshotRoot, 'evidence.json'),
    JSON.stringify(
      {
        mode,
        projectId,
        name,
        first,
        second,
        retired,
        exportBuildId: manifest.buildId,
        sourceCommit: manifest.identity.context.commit,
        manifestSha: sha(members['manifest.json']!),
        zipSha: sha(zip),
        pixelChecks,
        clock: { paused, stepBefore: before, stepAfter: (before + 1) % 4 },
        native,
        errors,
        consoleMessages,
        network,
      },
      null,
      2,
    ) + '\n',
  );
  expect(errors).toEqual([]);
  expect(consoleMessages.filter((m) => m.type === 'error' && !m.text.includes('422'))).toEqual([]);
});

test('project switches keep real build/recipe identities coherent while data is delayed and legacy export is converted', async ({
  page,
}) => {
  test.setTimeout(180000);
  const environment = loadE2EEnvironment();
  await mkdir(screenshotRoot, { recursive: true });
  const resources = JSON.parse(
      await readFile('apps/api/dist/resources/studio.json', 'utf8'),
    ) as Resources,
    store = new Persistence(
      environment.DATABASE_URL,
      await resolveAssetRoot(process.env),
      resources.profile,
    ),
    legacy = await store.createProject('R1旧06切换-' + randomUUID()),
    saved = await store.saveArchives(legacy.id, [resources.presets.art]),
    row = saved.records[0]!,
    snapshot = await store.adopt(legacy.id, 0, row.built.ir.dependencies),
    pack = await store.createPack(legacy.id, 'legacy-switch-pack'),
    prepared = await store.prepareBuild(
      legacy.id,
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
    old = await store.publish(prepared);
  const legacyManifest = sha((await store.readBuild(old.id)).files['manifest.json']!);
  expect(await store.db.finalExport.findUnique({ where: { buildId: old.id } })).toBeNull();
  await store.close();
  const requests: { method: string; url: string }[] = [],
    responses: { url: string; status: number }[] = [],
    errors: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) requests.push({ method: r.method(), url: r.url() });
  });
  page.on('response', (r) => {
    if (r.url().includes('/api/')) responses.push({ url: r.url(), status: r.status() });
  });
  page.on('pageerror', (e) => errors.push(e.message));
  const modernName = 'R1人工切换-' + randomUUID();
  let modernId = '',
    modernBuild = '',
    legacyData:
      { projectId: string; recipes: { id: string }[]; builds: { id: string }[] } | undefined;
  const identities = new Map<string, { recipes: Set<string>; builds: Set<string> }>();
  try {
    await page.goto('/');
    await page.getByLabel('项目名称').fill(modernName);
    await page.getByRole('button', { name: '创建项目', exact: true }).click();
    await expect(page.getByRole('heading', { name: modernName + ' · 创作素材' })).toBeVisible();
    await page.getByRole('button', { name: '导入原创美术样例', exact: true }).click();
    await expect(page.getByText('原创美术组件已保存', { exact: false })).toBeVisible();
    await adopt(page);
    modernBuild = (await build(page))!;
    modernId = (await page.evaluate(() => localStorage.getItem('studio-project')))!;
    for (const id of [legacy.id, modernId]) {
      const d = await (await page.request.get(`/api/projects/${id}/studio`)).json();
      identities.set(id, {
        recipes: new Set(d.recipes.map((r: { id: string }) => r.id)),
        builds: new Set(d.builds.map((b: { id: string }) => b.id)),
      });
      if (id === legacy.id) legacyData = d;
    }
    await page.getByRole('button', { name: legacy.name, exact: true }).click();
    await expect(page.getByRole('heading', { name: legacy.name + ' · 创作素材' })).toBeVisible();
    await expect(page.locator('canvas[aria-label="交付拼接预览"]')).toHaveAttribute(
      'data-build-id',
      old.id,
      { timeout: 30000 },
    );
    await ready(page);
    await expect(page.locator('canvas[aria-label="交付拼接预览"]')).toHaveAttribute(
      'data-build-id',
      old.id,
    );
    expect(
      requests.some(
        (r) =>
          r.method === 'POST' && r.url.includes(`/projects/${legacy.id}/builds/${old.id}/export`),
      ),
    ).toBe(true);
    // The former UI data still has exportBuildId=null here. It must never be paired with the next project.
    let delayedId = '',
      release = () => {},
      arrived = () => {};
    let hold: Promise<void> = Promise.resolve();
    await page.route('**/api/projects/*/studio', async (route) => {
      if (!delayedId || !route.request().url().includes(`/projects/${delayedId}/studio`))
        return route.continue();
      const response = await route.fetch();
      arrived();
      await hold;
      await route.fulfill({ response });
    });
    for (const [index, target] of [
      { id: modernId, name: modernName, build: modernBuild },
      { id: legacy.id, name: legacy.name, build: old.id },
      { id: modernId, name: modernName, build: modernBuild },
    ].entries()) {
      delayedId = target.id;
      hold = new Promise((resolve) => {
        release = resolve;
      });
      const received = new Promise<void>((resolve) => {
        arrived = resolve;
      });
      await page.getByRole('button', { name: target.name, exact: true }).click();
      await received;
      await expect(page.getByText('正在读取所选项目…', { exact: true })).toBeVisible();
      await expect(page.getByAltText('当前配方处理水面')).toHaveCount(0);
      await expect(page.locator('canvas[aria-label="交付拼接预览"]')).toHaveCount(0);
      await page.screenshot({
        path: resolve(screenshotRoot, `r1-project-switch-${index}-loading.png`),
      });
      delayedId = '';
      release();
      await expect(page.getByRole('heading', { name: target.name + ' · 创作素材' })).toBeVisible();
      await ready(page);
      await expect(page.locator('canvas[aria-label="交付拼接预览"]')).toHaveAttribute(
        'data-build-id',
        target.build,
      );
      await expect
        .poll(() =>
          page
            .getByAltText('当前配方处理水面')
            .evaluate((i) => (i as HTMLImageElement).naturalWidth),
        )
        .toBe(96);
    }
    await page.screenshot({
      path: resolve(screenshotRoot, 'r1-project-switch-stable.png'),
      fullPage: true,
    });
    for (const request of requests) {
      const match = new URL(request.url).pathname.match(
        /^\/api\/projects\/([^/]+)\/(builds|recipes)\/([^/]+)\//,
      );
      if (match && identities.has(match[1]!))
        expect(identities.get(match[1]!)![match[2] as 'builds' | 'recipes'].has(match[3]!)).toBe(
          true,
        );
    }
    expect(responses.filter((r) => r.status >= 400)).toEqual([]);
    expect(errors).toEqual([]);
    const check = new Persistence(
      environment.DATABASE_URL,
      await resolveAssetRoot(process.env),
      resources.profile,
    );
    try {
      expect(sha((await check.readBuild(old.id)).files['manifest.json']!)).toBe(legacyManifest);
      expect(
        (await check.db.project.findUniqueOrThrow({ where: { id: legacy.id } })).successfulBuildId,
      ).toBe(old.id);
      expect(
        (await check.db.project.findUniqueOrThrow({ where: { id: modernId } })).successfulBuildId,
      ).toBe(modernBuild);
    } finally {
      await check.close();
    }
  } finally {
    await writeFile(
      resolve(screenshotRoot, 'r1-project-switch.json'),
      JSON.stringify(
        {
          mode,
          sourceContext: resources.context,
          legacy: {
            id: legacy.id,
            build: old.id,
            internalManifestSha: legacyManifest,
            data: legacyData,
          },
          modern: { id: modernId, build: modernBuild },
          requests,
          responses,
          errors,
        },
        null,
        2,
      ) + '\n',
    );
  }
});
