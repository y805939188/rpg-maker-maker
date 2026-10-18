import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';

const [projectArg, outputArg] = process.argv.slice(2);
if (!projectArg || !outputArg)
  throw Error('Usage: verify:step09:mz <new prepared project> <new evidence directory>');
const project = resolve(projectArg),
  output = resolve(outputArg);
await mkdir(output, { recursive: false });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const reference = JSON.parse(
  await readFile(resolve(project, 'step09-build-reference.json'), 'utf8'),
);
const system = JSON.parse(await readFile(resolve(project, 'data/System.json'), 'utf8'));
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.css': 'text/css',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};
const server = createServer((req, res) => {
  void (async () => {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(project, '.' + (name === '/' ? '/index.html' : name));
    if (!path.startsWith(project + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const bytes = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' });
    res.end(bytes);
  })().catch(() => {
    res.writeHead(404);
    res.end();
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
const errors = [];
let result;
try {
  const page = await browser.newPage({ viewport: { width: 816, height: 624 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  // Wait for the real native title command readiness rather than guessing an
  // Enter delay or bypassing the native new-game path.
  await page.waitForFunction(
    () => globalThis.SceneManager?._scene?._commandWindow?.isOpenAndActive(),
    undefined,
    { timeout: 15000 },
  );
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () =>
      globalThis.SceneManager?._scene?.constructor.name === 'Scene_Map' &&
      globalThis.$gameMap?.mapId() === 1 &&
      globalThis.$gamePlayer?.x === 1 &&
      globalThis.$gamePlayer?.y === 1 &&
      globalThis.SceneManager?._scene?.isReady(),
    undefined,
    { timeout: 15000 },
  );
  const state = await page.evaluate(() => ({
    scene: globalThis.SceneManager._scene.constructor.name,
    engine: globalThis.Utils.RPGMAKER_VERSION,
    map: globalThis.$gameMap.mapId(),
    x: globalThis.$gamePlayer.x,
    y: globalThis.$gamePlayer.y,
    opacity: globalThis.$gameSystem.windowOpacity(),
    character: globalThis.$gamePlayer.characterName(),
    enabledPlugins: globalThis.$plugins.filter((plugin) => plugin.status).length,
  }));
  assert.equal(state.engine, '1.10.0');
  assert.equal(state.enabledPlugins, 0);
  assert.equal(state.opacity, system.advanced.windowOpacity);
  assert.ok(state.character.length > 0);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: resolve(output, 'map.png') });
  result = {
    result: 'PASS',
    scope: 'Native 1.10.0 core + locked Chromium boot to scripted Map001',
    state,
    buildId: reference.buildId,
    manifestSha256: reference.manifestSha256,
    profileHash: reference.profileHash,
    coreSha256: sha(await readFile(resolve(project, 'js/rmmz_core.js'))),
    errors,
    editorDrawing: 'NOT_EXECUTED',
    nativeOriginalHost: 'NOT_EXECUTED',
    art: 'PENDING_USER_ACCEPTANCE',
  };
} catch (error) {
  result = {
    result: 'FAIL',
    message: error.message,
    errors,
    scope: 'Supplemental core/Chromium boot only; not original NW.js or editor acceptance',
  };
  throw error;
} finally {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(resolve(output, 'boot.json'), JSON.stringify(result, null, 2) + '\n', {
    flag: 'wx',
  });
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(JSON.stringify(result));
