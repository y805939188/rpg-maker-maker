import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { CDPSession, Page, Request, Response } from '@playwright/test';

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
  private documentSession?: CDPSession;

  constructor(
    private page: Page,
    private origin: string,
    private projectId: string,
  ) {
    page.on('request', this.request);
    page.on('response', this.response);
    page.on('requestfinished', this.finished);
    page.on('requestfailed', this.failed);
  }

  /** Chromium's document commit event excludes pushState/hash changes and failed navigations. */
  async observeDocuments() {
    assert.ok(!this.documentSession, 'document observer may only be installed once');
    const session = await this.page.context().newCDPSession(this.page);
    this.documentSession = session;
    session.on('Page.frameNavigated', this.documentCommitted);
    await session.send('Page.enable');
  }

  private documentCommitted = (event: { frame: { parentId?: string } }) => {
    if (!event.frame.parentId) this.document++;
  };

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

  diagnostic(url: string, sha: string) {
    assert.ok(this.owned(url), 'required browser resource has the wrong origin/project owner');
    const matching = this.entries.filter((entry) => entry.url === url);
    return {
      document: this.document,
      matchingCount: matching.length,
      records: matching.slice(-8).map((entry) => ({
        id: entry.id,
        document: entry.document,
        currentDocument: entry.document === this.document,
        status: entry.status,
        method: entry.method,
        contentType: entry.contentType.slice(0, 80),
        transport: entry.transport,
        state: entry.state,
        bytes: entry.bytes?.length,
        sha: entry.sha,
        requiredSHA: entry.sha === sha,
        failure: entry.failure?.replace(/https?:\/\/\S+/g, '[url]').slice(0, 240),
        transportFailure: entry.transportFailure?.slice(0, 120),
      })),
    };
  }

  dispose() {
    this.page.off('request', this.request);
    this.page.off('response', this.response);
    this.page.off('requestfinished', this.finished);
    this.page.off('requestfailed', this.failed);
    this.documentSession?.off('Page.frameNavigated', this.documentCommitted);
  }
}
