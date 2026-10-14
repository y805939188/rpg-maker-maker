import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { Frame, Page, Request, Response } from '@playwright/test';

type Received = {
  id: number;
  document: number;
  url: string;
  method: string;
  status: number;
  contentType: string;
  transport: 'pending' | 'finished' | 'failed';
  state: 'pending' | 'received' | 'unavailable';
  bytes?: Buffer;
  sha?: string;
  failure?: string;
  transportFailure?: string;
};

/** Test-only wire capture: request identity and document lifetime, never last URL promise. */
export class ReceivedResources {
  private document = 0;
  private sequence = 0;
  private requests = new WeakMap<Request, { id: number; document: number }>();
  private responses = new WeakMap<Request, Received>();
  private entries: Received[] = [];

  constructor(
    private page: Page,
    private origin: string,
    private projectId: string,
  ) {
    page.on('request', this.request);
    page.on('response', this.response);
    page.on('requestfinished', this.finished);
    page.on('requestfailed', this.failed);
    page.on('framenavigated', this.navigated);
  }

  private owned(url: string) {
    const u = new URL(url);
    return (
      u.origin === this.origin &&
      u.pathname.startsWith(`/api/projects/${encodeURIComponent(this.projectId)}/`) &&
      /\/(recipes|builds)\//.test(u.pathname)
    );
  }

  private request = (request: Request) => {
    if (this.owned(request.url()) && request.frame() === this.page.mainFrame())
      this.requests.set(request, { id: ++this.sequence, document: this.document });
  };
  private response = (response: Response) => {
    const request = response.request(),
      identity = this.requests.get(request);
    if (!identity || request.method() !== 'GET' || response.status() !== 200) return;
    const entry: Received = {
      ...identity,
      url: response.url(),
      method: request.method(),
      status: response.status(),
      contentType: response.headers()['content-type'] ?? '',
      transport: 'pending',
      state: 'pending',
    };
    this.entries.push(entry);
    this.responses.set(request, entry);
    // Start immediately, but settle errors as explicit unavailable outcomes.
    // A cancelled older response must not replace the displayed image's body.
    void response.body().then(
      (bytes) => {
        entry.bytes = bytes;
        entry.sha = createHash('sha256').update(bytes).digest('hex');
        entry.state = 'received';
      },
      (error: unknown) => {
        entry.state = 'unavailable';
        entry.failure = error instanceof Error ? error.message : String(error);
      },
    );
  };
  private finished = (request: Request) => {
    const entry = this.responses.get(request);
    if (entry) entry.transport = 'finished';
  };
  private failed = (request: Request) => {
    const entry = this.responses.get(request);
    if (entry) {
      entry.transport = 'failed';
      entry.transportFailure =
        request.failure()?.errorText ?? 'Request failed without failure text';
    }
  };
  private navigated = (frame: Frame) => {
    if (frame === this.page.mainFrame()) this.document++;
  };

  find(url: string, sha: string) {
    assert.ok(this.owned(url), 'required browser resource has the wrong origin/project owner');
    return this.entries.findLast(
      (entry) =>
        entry.document === this.document &&
        entry.url === url &&
        entry.transport === 'finished' &&
        entry.state === 'received' &&
        entry.sha === sha,
    );
  }

  preview(build: string, scene: string) {
    return this.entries.findLast((entry) => {
      const u = new URL(entry.url);
      return (
        entry.document === this.document &&
        entry.transport === 'finished' &&
        entry.state === 'received' &&
        u.pathname ===
          `/api/projects/${encodeURIComponent(this.projectId)}/builds/${build}/preview` &&
        u.searchParams.get('scene') === scene
      );
    });
  }

  snapshot() {
    return this.entries.map(({ bytes: _bytes, ...entry }) => ({
      ...entry,
      currentDocument: entry.document === this.document,
    }));
  }

  dispose() {
    this.page.off('request', this.request);
    this.page.off('response', this.response);
    this.page.off('requestfinished', this.finished);
    this.page.off('requestfailed', this.failed);
    this.page.off('framenavigated', this.navigated);
  }
}
