import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { CDPSession, Page } from '@playwright/test';

type Received = {
  id: number;
  requestId: string;
  loaderId: string;
  frameId: string;
  document: number;
  url: string;
  method: string;
  status: number;
  contentType: string;
  transport: 'pending' | 'finished' | 'failed';
  state: 'pending' | 'received' | 'unavailable';
  completion?: 'loading-finished' | 'content-length';
  channel?: 'protocol-body' | 'protocol-stream';
  bytes?: Buffer;
  sha?: string;
  failure?: string;
  transportFailure?: string;
  expectedBytes?: number;
  streamReady: boolean;
  wireBytes: number;
};
type Wire = { entry: Received; buffered?: Buffer; chunks: Buffer[]; overflow: boolean };
const MAX_BYTES = 4 * 1024 * 1024;

/** Test-only Chromium wire capture. Every byte channel uses the same protocol request identity. */
export class ReceivedResources {
  private document = 0;
  private loaderId = '';
  private frameId = '';
  private sequence = 0;
  private documents = new Map<string, number>();
  private requests = new Map<string, Wire>();
  private entries: Received[] = [];
  private documentSession?: CDPSession;
  private disposed = false;

  constructor(
    private page: Page,
    private origin: string,
    private projectId: string,
  ) {}

  /** Install before navigation/reads. Same-document changes do not commit a new loader. */
  async observeDocuments() {
    assert.ok(!this.documentSession, 'document observer may only be installed once');
    const session = await this.page.context().newCDPSession(this.page);
    this.documentSession = session;
    session.on('Page.frameNavigated', this.documentCommitted);
    session.on('Network.requestWillBeSent', this.request);
    session.on('Network.responseReceived', this.response);
    session.on('Network.dataReceived', this.data);
    session.on('Network.loadingFinished', this.finished);
    session.on('Network.loadingFailed', this.failed);
    await session.send('Page.enable');
    const { frameTree } = await session.send('Page.getFrameTree');
    this.frameId = frameTree.frame.id;
    this.loaderId = frameTree.frame.loaderId;
    this.documents.set(this.loaderId, this.document);
    await session.send('Network.enable', {
      maxTotalBufferSize: 32 * 1024 * 1024,
      maxResourceBufferSize: MAX_BYTES,
    });
  }

  private documentCommitted = (event: {
    frame: { id: string; parentId?: string; loaderId: string };
  }) => {
    if (event.frame.parentId) return;
    this.frameId = event.frame.id;
    this.loaderId = event.frame.loaderId;
    this.documents.set(this.loaderId, ++this.document);
    for (const { entry } of this.requests.values())
      if (entry.loaderId === this.loaderId) entry.document = this.document;
  };

  private owned(url: string) {
    const u = new URL(url);
    return (
      u.origin === this.origin &&
      u.pathname.startsWith(`/api/projects/${encodeURIComponent(this.projectId)}/`) &&
      /\/(recipes|builds)\//.test(u.pathname)
    );
  }

  private request = (event: {
    requestId: string;
    frameId: string;
    loaderId: string;
    request: { url: string; method: string };
    redirectResponse?: unknown;
  }) => {
    // Redirects must never join two different responses under one receipt.
    this.requests.delete(event.requestId);
    if (
      event.redirectResponse ||
      event.frameId !== this.frameId ||
      event.request.method !== 'GET' ||
      !this.owned(event.request.url)
    )
      return;
    const entry: Received = {
      id: ++this.sequence,
      requestId: event.requestId,
      loaderId: event.loaderId,
      frameId: event.frameId,
      document: this.documents.get(event.loaderId) ?? -1,
      url: event.request.url,
      method: event.request.method,
      status: 0,
      contentType: '',
      transport: 'pending',
      state: 'pending',
      streamReady: false,
      wireBytes: 0,
    };
    this.requests.set(event.requestId, { entry, chunks: [], overflow: false });
  };

  private response = (event: {
    requestId: string;
    response: {
      url: string;
      status: number;
      headers: Record<string, string | number>;
      fromDiskCache?: boolean;
      fromServiceWorker?: boolean;
    };
  }) => {
    const wire = this.requests.get(event.requestId);
    if (!wire) return;
    const { entry } = wire,
      response = event.response,
      headers = Object.fromEntries(
        Object.entries(response.headers).map(([key, value]) => [key.toLowerCase(), String(value)]),
      );
    if (response.url !== entry.url || response.status !== 200) {
      this.requests.delete(event.requestId);
      return;
    }
    entry.status = response.status;
    entry.contentType = headers['content-type'] ?? '';
    this.entries.push(entry);
    // Failed transport is never EOF. Only an exact, unencoded HTTP Content-Length
    // can prove completeness without loadingFinished; chunked/cache/SW cannot.
    const length = headers['content-length'];
    if (
      entry.contentType.split(';')[0] === 'image/png' &&
      !response.fromDiskCache &&
      !response.fromServiceWorker &&
      !headers['content-encoding'] &&
      !headers['transfer-encoding'] &&
      length &&
      /^[1-9]\d*$/.test(length) &&
      Number(length) <= MAX_BYTES
    )
      entry.expectedBytes = Number(length);
    if (!entry.expectedBytes) return;
    // This non-intercepting channel reads only bytes already received for this
    // request. It neither issues another GET nor reconstructs bytes from the DOM.
    void this.documentSession!.send('Network.streamResourceContent', {
      requestId: entry.requestId,
    }).then(
      ({ bufferedData }) => {
        if (this.disposed) return;
        wire.buffered = Buffer.from(bufferedData, 'base64');
        entry.streamReady = true;
        this.settleStream(wire);
      },
      (error: unknown) => {
        entry.failure = error instanceof Error ? error.message : String(error);
        // A fast already-finished response is read through getResponseBody below.
      },
    );
  };

  private data = (event: { requestId: string; dataLength: number; data?: string }) => {
    const wire = this.requests.get(event.requestId);
    if (!wire) return;
    wire.entry.wireBytes += event.dataLength;
    if (wire.entry.wireBytes > MAX_BYTES) wire.overflow = true;
    if (event.data && !wire.overflow) wire.chunks.push(Buffer.from(event.data, 'base64'));
    this.settleStream(wire);
  };

  private save(wire: Wire, bytes: Buffer, channel: Received['channel']) {
    const { entry } = wire;
    if (this.disposed || wire.overflow || bytes.length > MAX_BYTES) return;
    if (entry.expectedBytes !== undefined && entry.expectedBytes !== bytes.length) return;
    entry.bytes = bytes;
    entry.sha = createHash('sha256').update(bytes).digest('hex');
    entry.channel = channel;
    entry.completion = entry.transport === 'finished' ? 'loading-finished' : 'content-length';
    entry.state = 'received';
  }

  private settleStream(wire: Wire) {
    const { entry } = wire;
    if (!entry.streamReady || wire.overflow || entry.transport === 'pending') return;
    const bytes = Buffer.concat([wire.buffered!, ...wire.chunks]);
    if (
      entry.expectedBytes !== bytes.length ||
      entry.wireBytes !== bytes.length ||
      (entry.transport === 'failed' && entry.transportFailure !== 'net::ERR_ABORTED')
    )
      return;
    this.save(wire, bytes, 'protocol-stream');
  }

  private finished = (event: { requestId: string }) => {
    const wire = this.requests.get(event.requestId);
    if (!wire || wire.entry.status !== 200) return;
    wire.entry.transport = 'finished';
    this.settleStream(wire);
    if (wire.entry.state === 'received') return;
    void this.documentSession!.send('Network.getResponseBody', { requestId: event.requestId }).then(
      ({ body, base64Encoded }) => {
        if (wire.entry.state === 'received') return;
        this.save(wire, Buffer.from(body, base64Encoded ? 'base64' : 'utf8'), 'protocol-body');
        if (wire.entry.state !== 'received') wire.entry.state = 'unavailable';
      },
      (error: unknown) => {
        if (wire.entry.state === 'received') return;
        wire.entry.state = 'unavailable';
        wire.entry.failure = error instanceof Error ? error.message : String(error);
      },
    );
  };

  private failed = (event: { requestId: string; errorText: string }) => {
    const wire = this.requests.get(event.requestId);
    if (!wire) return;
    wire.entry.transport = 'failed';
    wire.entry.transportFailure = event.errorText;
    wire.entry.state = 'unavailable';
    this.settleStream(wire);
  };

  find(url: string, sha: string) {
    assert.ok(this.owned(url), 'required browser resource has the wrong origin/project owner');
    return this.entries.findLast(
      (entry) =>
        entry.document === this.document &&
        entry.loaderId === this.loaderId &&
        entry.url === url &&
        entry.state === 'received' &&
        entry.completion !== undefined &&
        entry.sha === sha,
    );
  }

  preview(build: string, scene: string) {
    return this.entries.findLast((entry) => {
      const u = new URL(entry.url);
      return (
        entry.document === this.document &&
        entry.loaderId === this.loaderId &&
        entry.state === 'received' &&
        entry.completion !== undefined &&
        u.pathname ===
          `/api/projects/${encodeURIComponent(this.projectId)}/builds/${build}/preview` &&
        u.searchParams.get('scene') === scene
      );
    });
  }

  snapshot() {
    return this.entries.map(({ bytes: _bytes, ...entry }) => ({
      ...entry,
      currentDocument: entry.document === this.document && entry.loaderId === this.loaderId,
    }));
  }

  diagnostic(url: string, sha: string) {
    assert.ok(this.owned(url), 'required browser resource has the wrong origin/project owner');
    const matching = this.entries.filter((entry) => entry.url === url);
    return {
      document: this.document,
      matchingCount: matching.length,
      records: matching.slice(-8).map(({ bytes, ...entry }) => ({
        ...entry,
        url: undefined,
        currentDocument: entry.document === this.document && entry.loaderId === this.loaderId,
        contentType: entry.contentType.slice(0, 80),
        bytes: bytes?.length,
        requiredSHA: entry.sha === sha,
        failure: entry.failure?.replace(/https?:\/\/\S+/g, '[url]').slice(0, 240),
        transportFailure: entry.transportFailure?.slice(0, 120),
      })),
    };
  }

  dispose() {
    this.disposed = true;
    this.documentSession?.removeAllListeners();
    // Context/page close detaches this dedicated session; no shared page session is modified.
  }
}
