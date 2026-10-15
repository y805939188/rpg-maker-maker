import { createServer, type ServerResponse } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { chromium, expect as browserExpect, type Page } from '@playwright/test';
import sharp from 'sharp';
import { ReceivedResources } from './received-resources.js';
import { assertReceivedPng } from './received-png.js';
import { withPngTypeByte } from '../../../../tests/png-type-samples.js';

type Plan = {
  body: Buffer;
  status?: number;
  hold?: 'headers' | 'body';
  response?: ServerResponse;
  length?: number | undefined;
  encoding?: string;
};
const root = resolve('.local/received-resource-tests', randomUUID());
const path = '/api/projects/owned/recipes/recipe/processed?frame=0';
const sha = (body: Buffer) => createHash('sha256').update(body).digest('hex');
const plans: Plan[] = [],
  held = new Set<ServerResponse>();
let a: Buffer,
  b: Buffer,
  origin: string,
  reads = 0;
let browser: Awaited<ReturnType<typeof chromium.launch>>;
const html = `<script>
window.consumeThenCancel=async(path,declared)=>{
 const controller=new AbortController(),response=await fetch(path,{signal:controller.signal}),reader=response.body.getReader();
 const expected=declared??Number(response.headers.get('content-length')),parts=[];let length=0;
 while(length<expected){const next=await reader.read();if(next.done)throw Error('early EOF');parts.push(next.value);length+=next.value.length;}
 if(length!==expected)throw Error('length mismatch');
 controller.abort();reader.releaseLock();
 const bytes=new Uint8Array(length);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const image=new Image();image.src=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));await image.decode();
 image.id='saved';image.dataset.sha=hash;document.getElementById('saved')?.remove();document.body.append(image);return hash;
};
window.probe={controllers:[],async load(path,render=true){
 const controller=new AbortController();this.controllers.push(controller);
 const response=await fetch(path,{signal:controller.signal,cache:'no-store'}),body=await response.arrayBuffer();
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',body))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(render){const i=new Image();i.src=URL.createObjectURL(new Blob([body],{type:'image/png'}));await i.decode();i.id='saved';i.dataset.sha=hash;document.getElementById('saved')?.remove();document.body.append(i);}return hash;
}};</script>`;
const server = createServer((request, response) => {
  if (!request.url?.startsWith('/api/')) {
    response.end(html);
    return;
  }
  reads++;
  const plan = plans.shift();
  if (!plan) {
    response.writeHead(500).end();
    return;
  }
  plan.response = response;
  if (plan.hold) held.add(response);
  if (plan.hold === 'headers') return;
  response.writeHead(plan.status ?? 200, {
    'content-type': 'image/png',
    'cache-control': 'no-store',
    ...(plan.length === undefined ? {} : { 'content-length': plan.length }),
    ...(plan.encoding ? { 'content-encoding': plan.encoding } : {}),
  });
  if (plan.hold === 'body') {
    response.flushHeaders();
    response.write(plan.body.subarray(0, 8));
  } else response.end(plan.body);
});
beforeAll(async () => {
  await mkdir(root, { recursive: true });
  a = await readFile('tests/fixtures/art-water-0.png');
  b = await readFile('tests/fixtures/art-water-1.png');
  expect(sha(a)).not.toBe(sha(b));
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  origin = 'http://127.0.0.1:' + (server.address() as { port: number }).port;
  browser = await chromium.launch();
});
afterAll(async () => {
  for (const response of held) response.destroy();
  await browser?.close();
  server.closeAllConnections();
  await new Promise<void>((done) => server.close(() => done()));
});
async function fixture(
  name: string,
  run: (page: Page, capture: ReceivedResources) => Promise<void>,
) {
  const page = await browser.newPage(),
    capture = new ReceivedResources(page, origin, 'owned');
  const start = reads;
  try {
    await capture.observeDocuments();
    await page.goto(origin);
    await run(page, capture);
  } finally {
    await writeFile(
      resolve(root, name + '.json'),
      JSON.stringify({ reads: reads - start, records: capture.snapshot() }, null, 2) + '\n',
    );
    capture.dispose();
    await page.close();
    for (const response of held) response.destroy();
    held.clear();
    plans.length = 0;
  }
}
async function rendered(page: Page, capture: ReceivedResources, url = origin + path) {
  const image = page.locator('#saved'),
    hash = await image.getAttribute('data-sha');
  assert.ok(hash);
  const received = capture.find(url, hash);
  assert.ok(received, 'current required actual body is missing or unavailable');
  assert.equal(received.sha, hash);
  assertReceivedPng(received.bytes!, { width: 96, height: 144 });
  const decoded = await sharp(received.bytes!)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.deepEqual([decoded.info.width, decoded.info.height], [96, 144]);
  const pixels = await image.evaluate((i) => {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 144;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(i as HTMLImageElement, 0, 0);
    return [...ctx.getImageData(0, 0, 96, 144).data];
  });
  assert.deepEqual(Buffer.from(pixels), decoded.data);
  return received;
}
async function complete(page: Page, capture: ReceivedResources, body: Buffer, url = path) {
  plans.push({ body });
  await page.evaluate('window.probe.load(' + JSON.stringify(url) + ')');
  await browserExpect.poll(() => capture.find(origin + url, sha(body))?.sha).toBe(sha(body));
}

it('real cancelled sameURL response reproduces old false failure while current actual image remains verifiable', async () => {
  await fixture('cancel-same-url', async (page, capture) => {
    const old = new Map<string, Promise<Buffer>>();
    page.on('response', (r) => {
      if (r.url() === origin + path) {
        const value = r.body();
        void value.catch(() => undefined);
        old.set(r.url(), value);
      }
    });
    await complete(page, capture, a);
    const first = await rendered(page, capture),
      before = reads;
    plans.push({ body: b, hold: 'body' });
    const reply = page.waitForResponse(origin + path),
      failed = page.waitForEvent('requestfailed');
    await page.evaluate(
      'void (window.pending=window.probe.load(' + JSON.stringify(path) + ').catch(e=>e.name))',
    );
    await reply;
    await page.evaluate('window.probe.controllers.at(-1).abort()');
    await failed;
    await expect(old.get(origin + path)).rejects.toThrow('No data found for resource');
    await browserExpect
      .poll(() => capture.snapshot().filter((r) => r.state === 'unavailable').length)
      .toBe(1);
    expect((await rendered(page, capture)).id).toBe(first.id);
    expect(capture.find(origin + path, sha(b))).toBeUndefined();
    expect(reads - before).toBe(1); // no retry/reprocessing to obtain a replacement test body
    await complete(page, capture, b);
    expect((await rendered(page, capture)).id).not.toBe(first.id);
  });
});

it('navigation retires old sameURL bodies and requires a new actual body in the new document', async () => {
  await fixture('navigation', async (page, capture) => {
    await complete(page, capture, a);
    plans.push({ body: b, hold: 'body' });
    const reply = page.waitForResponse(origin + path),
      failed = page.waitForEvent('requestfailed');
    await page.evaluate(
      'void (window.pending=window.probe.load(' + JSON.stringify(path) + ').catch(e=>e.name))',
    );
    await reply;
    await page.evaluate('window.probe.controllers.at(-1).abort()');
    await failed;
    await page.goto(origin + '/next');
    expect(capture.find(origin + path, sha(a))).toBeUndefined();
    expect(capture.find(origin + path, sha(b))).toBeUndefined();
    await complete(page, capture, b);
    expect((await rendered(page, capture)).sha).toBe(sha(b));
  });
});

it('a late older sameURL response cannot overwrite the newer displayed actual PNG', async () => {
  await fixture('late-same-url', async (page, capture) => {
    const first: Plan = { body: a, hold: 'headers' };
    plans.push(first);
    const request = page.waitForRequest(origin + path);
    await page.evaluate(
      'void (window.older=window.probe.load(' + JSON.stringify(path) + ',false))',
    );
    await request;
    await browserExpect.poll(() => Boolean(first.response)).toBe(true);
    await complete(page, capture, b);
    first.response!.writeHead(200, { 'content-type': 'image/png' });
    first.response!.end(a);
    await page.evaluate('window.older');
    await browserExpect.poll(() => capture.find(origin + path, sha(a))?.sha).toBe(sha(a));
    expect((await rendered(page, capture)).sha).toBe(sha(b));
    expect(capture.snapshot().filter((r) => r.state === 'received')).toHaveLength(2);
  });
});

it('same-document URL changes retain the current actual PNG without another network read', async () => {
  await fixture('same-document', async (page, capture) => {
    await complete(page, capture, a);
    const first = await rendered(page, capture),
      before = reads;
    await page.evaluate(() => history.pushState({}, '', '#scene'));
    expect((await rendered(page, capture)).id).toBe(first.id);
    await page.evaluate(() => history.replaceState({}, '', '#other-scene'));
    expect((await rendered(page, capture)).id).toBe(first.id);
    expect(reads).toBe(before);
  });
});

it('a failed navigation preserves the actual document but a committed sameURL reload retires it', async () => {
  await fixture('failed-and-reload', async (page, capture) => {
    await complete(page, capture, a);
    const first = await rendered(page, capture);
    await page.route('**/blocked-navigation', (route) => route.abort('aborted'));
    await expect(page.goto(origin + '/blocked-navigation')).rejects.toThrow();
    expect((await rendered(page, capture)).id).toBe(first.id);
    await page.unroute('**/blocked-navigation');
    await page.reload();
    expect(capture.find(origin + path, sha(a))).toBeUndefined();
    await complete(page, capture, a);
    expect((await rendered(page, capture)).id).not.toBe(first.id);
  });
});

it('bounded diagnostics expose missing current evidence without leaking bodies or accepting an image alone', async () => {
  await fixture('bounded-diagnostics', async (page, capture) => {
    for (let n = 0; n < 10; n++) await complete(page, capture, a);
    const current = await rendered(page, capture),
      diagnostic = capture.diagnostic(origin + path, current.sha!);
    expect(diagnostic.matchingCount).toBe(10);
    expect(diagnostic.records).toHaveLength(8);
    expect(diagnostic.records.every((r) => r.currentDocument && r.requiredSHA)).toBe(true);
    expect(JSON.stringify(diagnostic)).not.toContain('"bytes":{');
    expect(diagnostic.records.every((r) => typeof r.bytes === 'number')).toBe(true);
    const late = new ReceivedResources(page, origin, 'owned');
    try {
      await late.observeDocuments();
      expect(late.diagnostic(origin + path, current.sha!).matchingCount).toBe(0);
      await expect(rendered(page, late)).rejects.toThrow('current required actual body is missing');
      expect(late.find(origin + path, current.sha!)).toBeUndefined();
    } finally {
      late.dispose();
    }
  });
});

it('missing, wrong owner/origin/frame/hash and non200 bodies cannot satisfy current image identity', async () => {
  await fixture('identity-negatives', async (page, capture) => {
    await complete(page, capture, a);
    const received = await rendered(page, capture);
    expect(capture.find(origin + path, sha(b))).toBeUndefined();
    expect(
      capture.find(origin + path.replace('frame=0', 'frame=1'), received.sha!),
    ).toBeUndefined();
    expect(() => capture.find(origin + path.replace('/owned/', '/other/'), received.sha!)).toThrow(
      'wrong origin/project owner',
    );
    expect(() =>
      capture.find('http://localhost:' + new URL(origin).port + path, received.sha!),
    ).toThrow('wrong origin/project owner');
    expect(
      capture.find(origin + path.replace('/recipe/', '/missing/'), received.sha!),
    ).toBeUndefined();
    const foreign = path.replace('/owned/', '/other/');
    plans.push({ body: b });
    await page.evaluate('window.probe.load(' + JSON.stringify(foreign) + ',false)');
    expect(capture.snapshot().some((r) => r.url === origin + foreign)).toBe(false);
    const unavailable = path.replace('frame=0', 'frame=2');
    plans.push({ body: b, status: 422 });
    await page.evaluate('window.probe.load(' + JSON.stringify(unavailable) + ',false)');
    expect(capture.find(origin + unavailable, sha(b))).toBeUndefined();
  });
});

it('corrupt actual PNG or a mismatched rendered hash is rejected rather than replaced by a valid old body', async () => {
  await fixture('corrupt-and-hash', async (page, capture) => {
    await complete(page, capture, a);
    plans.push({ body: Buffer.from('not a PNG') });
    await expect(
      page.evaluate('window.probe.load(' + JSON.stringify(path) + ')'),
    ).rejects.toThrow();
    await browserExpect
      .poll(() => capture.find(origin + path, sha(Buffer.from('not a PNG')))?.sha)
      .toBeTruthy();
    await expect(
      sharp(capture.find(origin + path, sha(Buffer.from('not a PNG')))!.bytes!)
        .raw()
        .toBuffer(),
    ).rejects.toThrow();
    await page.locator('#saved').evaluate((i) => {
      i.setAttribute('data-sha', 'f'.repeat(64));
    });
    await expect(rendered(page, capture)).rejects.toThrow('current required actual body');
    const wrongDimensions = await sharp(a).resize(48, 72).png().toBuffer();
    await complete(page, capture, wrongDimensions);
    await expect(rendered(page, capture)).rejects.toThrow();
  });
});

it('complete current network bytes survive consumer cancellation while the old response.body observer fails', async () => {
  await fixture('complete-then-cancel', async (page, capture) => {
    const plan: Plan = { body: a, length: a.length, hold: 'body' };
    plans.push(plan);
    let oldBody: Promise<Buffer> | undefined;
    page.on('response', (response) => {
      if (response.url() === origin + path) {
        oldBody = response.body();
        void oldBody.catch(() => undefined);
      }
    });
    const failed = page.waitForEvent('requestfailed', { timeout: 5000 }),
      consumer = page.evaluate('window.consumeThenCancel(' + JSON.stringify(path) + ')');
    await browserExpect.poll(() => capture.snapshot().at(-1)?.streamReady).toBe(true);
    // Headers/first chunk -> installed protocol stream -> remaining real bytes -> abort.
    plan.response!.write(a.subarray(8));

    expect(await consumer).toBe(sha(a));
    await failed;
    plan.response!.end();
    await expect(oldBody).rejects.toThrow('No data found for resource');
    await browserExpect.poll(() => capture.find(origin + path, sha(a))?.sha).toBe(sha(a));
    const received = await rendered(page, capture);
    expect(received.transport).toBe('failed');
    expect(received.transportFailure).toBe('net::ERR_ABORTED');
    expect(received.channel).toBe('protocol-stream');
    expect(received.completion).toBe('content-length');
    expect(received.wireBytes).toBe(a.length);
    expect(received.expectedBytes).toBe(a.length);
    expect(received.bytes).toEqual(a);
    expect(capture.snapshot()).toHaveLength(1);
    await page.screenshot({ path: resolve(root, 'complete-then-cancel.png') });
    await page.reload();
    expect(capture.find(origin + path, sha(a))).toBeUndefined();
  });
});

it('abort is not completion: partial, unknown length and encoded bodies never satisfy the current receipt', async () => {
  await fixture('stream-incomplete', async (page, capture) => {
    for (const length of [a.length, undefined]) {
      const plan: Plan = { body: a, length, hold: 'body' };
      plans.push(plan);
      const reply = page.waitForResponse(origin + path),
        failed = page.waitForEvent('requestfailed', { timeout: 5000 });
      await page.evaluate(
        'void (window.pending=window.probe.load(' + JSON.stringify(path) + ').catch(e=>e.name))',
      );
      await reply;
      if (length) await browserExpect.poll(() => capture.snapshot().at(-1)?.streamReady).toBe(true);
      await page.evaluate('window.probe.controllers.at(-1).abort()');
      await failed;
      expect(capture.find(origin + path, sha(a))).toBeUndefined();
      await browserExpect.poll(() => capture.snapshot().at(-1)?.state).toBe('unavailable');
    }
    const plan: Plan = { body: a, length: a.length, encoding: 'gzip', hold: 'body' };
    plans.push(plan);
    const reply = page.waitForResponse(origin + path);
    await page.evaluate(
      'void (window.pending=window.probe.load(' + JSON.stringify(path) + ').catch(e=>e.name))',
    );
    await reply;
    expect(capture.snapshot().at(-1)?.expectedBytes).toBeUndefined();
    await page.evaluate('window.probe.controllers.at(-1).abort()');
    expect(capture.find(origin + path, sha(a))).toBeUndefined();
    expect(capture.snapshot().every((r) => r.state !== 'received')).toBe(true);
  });
});

it('an iframe full response cannot supply the main document even with the same owner URL and hash', async () => {
  await fixture('iframe-wire', async (page, capture) => {
    await page.evaluate(() => {
      const i = document.createElement('iframe');
      i.src = '/child';
      document.body.append(i);
    });
    await browserExpect.poll(() => page.frames().length).toBe(2);
    plans.push({ body: a, length: a.length });
    const frame = page.frames().find((f) => f !== page.mainFrame())!;
    await frame.waitForFunction('typeof window.probe === "object"');
    expect(await frame.evaluate('window.probe.load(' + JSON.stringify(path) + ')')).toBe(sha(a));
    expect(capture.find(origin + path, sha(a))).toBeUndefined();
    expect(capture.snapshot()).toHaveLength(0);
    await complete(page, capture, a);
    await rendered(page, capture);
  });
});

it('a decoded complete PNG alone is insufficient when HTTP framing cannot prove complete reception', async () => {
  await fixture('decoded-but-framing-incomplete', async (page, capture) => {
    for (const length of [undefined, a.length + 1]) {
      const plan: Plan = { body: a, length, hold: 'body' };
      plans.push(plan);
      const failed = page.waitForEvent('requestfailed', { timeout: 5000 }),
        consumer = page.evaluate(
          'window.consumeThenCancel(' + JSON.stringify(path) + ',' + a.length + ')',
        );
      await browserExpect.poll(() => capture.snapshot().length).toBe(length ? 2 : 1);
      if (length) await browserExpect.poll(() => capture.snapshot().at(-1)?.streamReady).toBe(true);
      plan.response!.write(a.subarray(8));
      expect(await consumer).toBe(sha(a));
      await failed;
      plan.response!.end();
      await browserExpect.poll(() => capture.snapshot().at(-1)?.state).toBe('unavailable');
      expect(await page.locator('#saved').getAttribute('data-sha')).toBe(sha(a));
      expect(capture.find(origin + path, sha(a))).toBeUndefined();
      await expect(rendered(page, capture)).rejects.toThrow(
        'current required actual body is missing',
      );
    }
  });
});

it.each(['finished', 'complete-abort'] as const)(
  'rejects bad PNG CRC on the same actual %s request before pixel equivalence can imply validity',
  async (channel) => {
    await fixture('crc-' + channel, async (page, capture) => {
      const bad = Buffer.from(a);
      bad[bad.length - 1] = bad[bad.length - 1]! ^ 1;
      if (channel === 'finished') {
        await complete(page, capture, bad);
      } else {
        const plan: Plan = { body: bad, length: bad.length, hold: 'body' };
        plans.push(plan);
        const failed = page.waitForEvent('requestfailed', { timeout: 5000 }),
          consumer = page.evaluate('window.consumeThenCancel(' + JSON.stringify(path) + ')');
        await browserExpect.poll(() => capture.snapshot().at(-1)?.streamReady).toBe(true);
        plan.response!.write(bad.subarray(8));
        expect(await consumer).toBe(sha(bad));
        await failed;
        plan.response!.end();
        await browserExpect.poll(() => capture.find(origin + path, sha(bad))?.sha).toBe(sha(bad));
      }
      const receipt = capture.find(origin + path, sha(bad));
      expect(receipt?.bytes).toEqual(bad);
      expect(receipt?.completion).toBe(
        channel === 'finished' ? 'loading-finished' : 'content-length',
      );
      expect(await page.locator('#saved').getAttribute('data-sha')).toBe(sha(bad));
      // Both real decoders still accept these bytes. CRC validity is a separate mandatory check.
      const original = await sharp(a).ensureAlpha().raw().toBuffer(),
        decodedBad = await sharp(receipt!.bytes!).ensureAlpha().raw().toBuffer();
      expect(decodedBad).toEqual(original);
      await expect(rendered(page, capture)).rejects.toMatchObject({ code: 'PNG_CRC' });
      await writeFile(resolve(root, 'crc-' + channel + '-invalid.png'), bad);
      await page.screenshot({ path: resolve(root, 'crc-' + channel + '-decoded.png') });
      await complete(page, capture, a);
      await rendered(page, capture);
    });
  },
);

it.each(['finished', 'complete-abort'] as const)(
  'rejects non-ASCII raw PNG type with valid CRC on the same actual %s request before pixel equivalence can imply validity',
  async (channel) => {
    await fixture('chunk-type-' + channel, async (page, capture) => {
      const bad = withPngTypeByte(a, 'IEND', 0, 'I'.charCodeAt(0) | 0x80);
      if (channel === 'finished') {
        await complete(page, capture, bad);
      } else {
        const plan: Plan = { body: bad, length: bad.length, hold: 'body' };
        plans.push(plan);
        const failed = page.waitForEvent('requestfailed', { timeout: 5000 }),
          consumer = page.evaluate('window.consumeThenCancel(' + JSON.stringify(path) + ')');
        await browserExpect.poll(() => capture.snapshot().at(-1)?.streamReady).toBe(true);
        plan.response!.write(bad.subarray(8));
        expect(await consumer).toBe(sha(bad));
        await failed;
        plan.response!.end();
        await browserExpect.poll(() => capture.find(origin + path, sha(bad))?.sha).toBe(sha(bad));
      }
      const receipt = capture.find(origin + path, sha(bad));
      expect(receipt?.bytes).toEqual(bad);
      expect(receipt?.completion).toBe(
        channel === 'finished' ? 'loading-finished' : 'content-length',
      );
      expect(await page.locator('#saved').getAttribute('data-sha')).toBe(sha(bad));
      // Both real decoders still accept these bytes. Raw chunk-name validity is a separate mandatory check.
      const original = await sharp(a).ensureAlpha().raw().toBuffer(),
        decodedBad = await sharp(receipt!.bytes!).ensureAlpha().raw().toBuffer();
      expect(decodedBad).toEqual(original);
      await expect(rendered(page, capture)).rejects.toMatchObject({ code: 'PNG_STRUCTURE' });
      await writeFile(resolve(root, 'chunk-type-' + channel + '-invalid.png'), bad);
      await page.screenshot({ path: resolve(root, 'chunk-type-' + channel + '-decoded.png') });
      await complete(page, capture, a);
      await rendered(page, capture);
    });
  },
);
