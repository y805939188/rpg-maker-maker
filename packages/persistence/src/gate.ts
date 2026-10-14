import { AsyncLocalStorage } from 'node:async_hooks';
import { strict as assert } from 'node:assert';
import pg from 'pg';
import type { Prisma } from '@prisma/client';

export class GateLostError extends Error {
  constructor() {
    super('Write gate connection or lock lost');
    this.name = 'GateLostError';
  }
}
class GateEndedError extends Error {
  constructor() {
    super('Write gate lifetime ended');
    this.name = 'GateEndedError';
  }
}
export interface GateLease {
  readonly signal: AbortSignal;
  readonly backendPid: number;
  readonly exclusive: boolean;
  readonly scope: string | undefined;
  check(): void;
  checkpoint(): Promise<void>;
  fence(tx: Prisma.TransactionClient): Promise<void>;
}
// Session locks cover I/O; short transaction locks keep DB commits ahead of maintenance
// and serialize same-scope transactions if their original session disappears.
export class WriteGate {
  // Reconstructing a store for the same database must not erase an enclosing
  // lifetime. ALS still isolates independent async call chains.
  static #contexts = new Map<string, AsyncLocalStorage<readonly GateLease[]>>();
  #context: AsyncLocalStorage<readonly GateLease[]>;
  constructor(readonly databaseUrl: string) {
    const u = new URL(databaseUrl);
    if (
      !['postgresql:', 'postgres:'].includes(u.protocol) ||
      u.hostname !== '127.0.0.1' ||
      !/^\/tileset_[a-z0-9_]+$/.test(u.pathname) ||
      !u.username ||
      u.search ||
      u.hash
    )
      throw Error('Dedicated loopback database required');
    const databaseKey = `${u.hostname}:${u.port || '5432'}${u.pathname}`;
    this.#context =
      WriteGate.#contexts.get(databaseKey) ?? new AsyncLocalStorage<readonly GateLease[]>();
    WriteGate.#contexts.set(databaseKey, this.#context);
  }
  current() {
    return this.#context.getStore()?.at(-1);
  }
  require() {
    const lease = this.current();
    assert.ok(lease, 'A live write gate is required');
    lease.check();
    return lease;
  }
  async run<T>(
    exclusive: boolean,
    operation: (lease: GateLease) => Promise<T>,
    scope?: string,
    signal?: AbortSignal,
  ): Promise<T> {
    signal?.throwIfAborted();
    let parents = this.#context.getStore() ?? [],
      parent = parents.at(-1);
    // A new session cannot replace an invalid inherited lifetime. Maintenance is
    // top-level only; repeated scoped locks would deadlock across our sessions.
    await parent?.checkpoint();
    if (parent && exclusive) throw Error('Nested maintenance is unsupported');
    if (scope && parents.some((lease) => lease.scope === scope))
      throw Error('Scoped write gate reentry is unsupported');
    const client = new pg.Client({
      connectionString: this.databaseUrl,
      connectionTimeoutMillis: 5000,
    });
    const controller = new AbortController();
    let ending = false,
      endPromise: Promise<void> | undefined;
    const end = () => (endPromise ??= client.end().catch(() => {}));
    const lost = () => {
      if (!ending && !controller.signal.aborted) controller.abort(new GateLostError());
    };
    const inheritedEnd = () => {
      const reason: unknown = parent!.signal.reason;
      if (parent!.exclusive && reason instanceof GateEndedError) {
        // Writers queued during a live maintenance window may start after its
        // normal release. They keep waiting for the actual PG lock release.
        // A lost maintenance lease instead cancels that pending session.
        parents = [];
        parent = undefined;
      } else controller.abort(reason);
    };
    const externalEnd = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', externalEnd, { once: true });
    if (signal?.aborted) externalEnd();
    parent?.signal.addEventListener('abort', inheritedEnd, { once: true });
    controller.signal.addEventListener('abort', () => void end(), { once: true });
    client.on('error', lost);
    client.on('end', lost);
    const check = () => {
      parent?.check();
      controller.signal.throwIfAborted();
    };
    try {
      check();
      await client.connect();
      check();
      await client.query("SET lock_timeout = '30s'");
      check();
      if (parent && !parent.exclusive) {
        // Do not wait behind maintenance which is itself waiting for our parent.
        const acquired = await client.query<{ locked: boolean }>(
          'SELECT pg_try_advisory_lock_shared(6006,0) AS locked',
        );
        if (!acquired.rows[0]?.locked) throw Error('Nested write blocked by queued maintenance');
      } else
        await client.query(
          exclusive ? 'SELECT pg_advisory_lock(6006,0)' : 'SELECT pg_advisory_lock_shared(6006,0)',
        );
      check();
      if (scope) {
        await client.query('SELECT pg_advisory_lock(6007,hashtext($1))', [scope]);
        check();
      }
      const pid = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
      check();
      const checkpoint = async () => {
        check();
        await parent?.checkpoint();
        try {
          const locks = await client.query<{ maintenance: boolean; scope: boolean }>(
            `SELECT
            EXISTS(SELECT 1 FROM pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory' AND classid=6006 AND objid=0 AND granted AND mode=$1) AS maintenance,
            ($2::text IS NULL OR EXISTS(SELECT 1 FROM pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory' AND classid=6007 AND objid=(hashtext($2)::bigint & 4294967295) AND granted AND mode='ExclusiveLock')) AS scope`,
            [exclusive ? 'ExclusiveLock' : 'ShareLock', scope ?? null],
          );
          if (!locks.rows[0]?.maintenance || !locks.rows[0]?.scope) lost();
          check();
        } catch {
          lost();
          check();
        }
      };
      const lease: GateLease = Object.freeze({
        signal: controller.signal,
        backendPid: pid.rows[0]!.pid,
        exclusive,
        scope,
        check,
        checkpoint,
        fence: async (tx: Prisma.TransactionClient) => {
          check();
          assert.equal(exclusive, false, 'Mutation transactions cannot run under maintenance');
          // Every enclosing scope must be fenced until this transaction ends,
          // even if its session vanishes between a checkpoint and COMMIT.
          await parent?.fence(tx);
          await tx.$queryRaw`SELECT pg_advisory_xact_lock_shared(6006,0)::text`;
          check();
          if (scope) {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(6008,hashtext(${scope}))::text`;
            check();
          }
          await checkpoint();
        },
      });
      await checkpoint();
      return await this.#context.run([...parents, lease], async () => {
        const value = await operation(lease);
        await checkpoint();
        return value;
      });
    } finally {
      ending = true;
      signal?.removeEventListener('abort', externalEnd);
      parent?.signal.removeEventListener('abort', inheritedEnd);
      // Normal completion closes a lifetime too, but is not connection loss.
      // Unawaited descendants cannot outlive the operation that owns their locks.
      if (!controller.signal.aborted) controller.abort(new GateEndedError());
      await end();
    }
  }
  write<T>(operation: (lease: GateLease) => Promise<T>, scope?: string, signal?: AbortSignal) {
    return this.run(false, operation, scope, signal);
  }
  pause<T>(operation: (lease: GateLease) => Promise<T>) {
    return this.run(true, operation);
  }
}
