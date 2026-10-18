import { beforeAll, expect, it } from 'vitest';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { EXPLORATION, recordStep09, step09Summary } from '../src/step09-budget.js';

let wrapper: string;
const tsx = createRequire(import.meta.url).resolve('tsx');
const entry = pathToFileURL(resolve('apps/api/src/step09-budget.ts')).href;
beforeAll(async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'step09-budget-process-'));
  wrapper = resolve(dir, 'reservation.mjs');
  await writeFile(
    wrapper,
    `
import {once} from 'node:events';
import {reserveStep09,recordStep09} from ${JSON.stringify(entry)};
const [root,inputText,statesText]=process.argv.slice(2);
process.send({ready:true});await once(process,'message');
try {
 const input=JSON.parse(inputText);
 await reserveStep09(root,input,input.caseId==='T01'?'wavespeed-ai/flux-schnell':'wavespeed-ai/flux-dev');
 for(const state of JSON.parse(statesText))await recordStep09(root,input.taskId,state);
 process.send({ok:true,pid:process.pid});
}catch(e){process.send({ok:false,code:e.message,pid:process.pid});}
process.disconnect();
`,
  );
});
async function root() {
  const dir = await mkdtemp(resolve(tmpdir(), 'step09-concurrency-'));
  await writeFile(
    resolve(dir, 'approval.json'),
    JSON.stringify({
      version: EXPLORATION.version,
      approvedBy: 'HUMAN_USER',
      authorization: 'SYNTHETIC_TEST_ONLY_NOT_LIVE_APPROVAL',
      approvedAt: new Date().toISOString(),
      totalUsd: 1,
      maxSubmissions: 10,
    }),
  );
  return dir;
}
function input(caseId: 'T01' | 'R01' = 'T01') {
  return {
    taskId: randomUUID(),
    caseId,
    purpose: 'initial',
    component: 'grass',
    quotedUsd: caseId === 'T01' ? 0.003 : 0.012,
  };
}
async function child(dir: string, value: ReturnType<typeof input>, states: string[] = []) {
  const process = fork(wrapper, [dir, JSON.stringify(value), JSON.stringify(states)], {
    execArgv: ['--import', tsx],
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  const exit = once(process, 'exit');
  const [ready] = await once(process, 'message');
  expect(ready).toEqual({ ready: true });
  return {
    start: async () => {
      const result = once(process, 'message');
      process.send('start');
      const [message] = await result;
      expect((await exit)[0]).toBe(0);
      return message as { ok: boolean; code?: string; pid: number };
    },
  };
}

it('two independent processes cannot reserve a second slot while KNOWN or local-only outcomes are unresolved', async () => {
  for (const local of [
    [],
    ['FAILED'],
    ['CANCELLED'],
    ['DISCARDED'],
    ['UNUSABLE'],
    ['ARCHIVE_FAILED'],
    ['ARCHIVE_RETRY'],
  ]) {
    const dir = await root(),
      first = input();
    expect((await (await child(dir, first, ['KNOWN', ...local])).start()).ok).toBe(true);
    const second = await (await child(dir, input('R01'))).start();
    expect(second).toMatchObject({ ok: false, code: 'STEP09_UNRESOLVED_SUBMISSION' });
    const summary = await step09Summary(dir);
    expect(summary.submissions).toBe(1);
    expect(summary.entries[0]!.events.map((e) => e.state)).toEqual(['RESERVED', 'KNOWN', ...local]);
  }
}, 30000);

it('simultaneous independent processes atomically admit exactly one reservation', async () => {
  const dir = await root(),
    a = await child(dir, input()),
    b = await child(dir, input('R01'));
  const results = await Promise.all([a.start(), b.start()]);
  expect(results[0]!.pid).not.toBe(results[1]!.pid);
  expect(results.filter((r) => r.ok)).toHaveLength(1);
  expect((await step09Summary(dir)).submissions).toBe(1);
});

it('only confirmed remote terminal proof releases the slot, including legacy ARCHIVED; UNKNOWN remains frozen', async () => {
  for (const terminal of ['REMOTE_SUCCEEDED', 'REMOTE_FAILED', 'REJECTED', 'ARCHIVED']) {
    const dir = await root(),
      first = input();
    expect((await (await child(dir, first, ['KNOWN', terminal, 'CANCELLED'])).start()).ok).toBe(
      true,
    );
    expect((await (await child(dir, input('R01'))).start()).ok).toBe(true);
    expect((await step09Summary(dir)).submissions).toBe(2);
  }
  const dir = await root(),
    first = input();
  expect((await (await child(dir, first, ['UNKNOWN'])).start()).ok).toBe(true);
  await expect(recordStep09(dir, first.taskId, 'REMOTE_SUCCEEDED')).rejects.toThrow(
    'HUMAN_RECONCILIATION',
  );
  expect((await (await child(dir, input('R01'))).start()).ok).toBe(false);
});
