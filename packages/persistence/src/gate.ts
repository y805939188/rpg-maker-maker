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
  #context = new AsyncLocalStorage<GateLease>();
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
  }
  current() {
    return this.#context.getStore();
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
  ): Promise<T> {
    const client = new pg.Client({
      connectionString: this.databaseUrl,
      connectionTimeoutMillis: 5000,
    });
    const controller = new AbortController();
    const lost = () => {
      if (!controller.signal.aborted) controller.abort(new GateLostError());
    };
    client.on('error', lost);
    client.on('end', lost);
    const check = () => controller.signal.throwIfAborted();
    try {
      await client.connect();
      check();
      await client.query("SET lock_timeout = '30s'");
      check();
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
      return await this.#context.run(lease, async () => {
        const value = await operation(lease);
        await checkpoint();
        return value;
      });
    } finally {
      lost();
      await client.end();
    }
  }
  write<T>(operation: (lease: GateLease) => Promise<T>, scope?: string) {
    return this.run(false, operation, scope);
  }
  pause<T>(operation: (lease: GateLease) => Promise<T>) {
    return this.run(true, operation);
  }
}
