import pg from 'pg';
// Session locks span files/remote I/O without keeping a database transaction open.
export class WriteGate {
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
  async run<T>(exclusive: boolean, operation: () => Promise<T>, scope?: string): Promise<T> {
    const client = new pg.Client({
      connectionString: this.databaseUrl,
      connectionTimeoutMillis: 5000,
    });
    // A dead lock session invalidates the operation; callers must not continue publication.
    const controller = new AbortController();
    client.on('error', () => controller.abort());
    await client.connect();
    try {
      await client.query("SET lock_timeout = '30s'");
      await client.query(
        exclusive ? 'SELECT pg_advisory_lock(6006, 0)' : 'SELECT pg_advisory_lock_shared(6006, 0)',
      );
      if (scope) await client.query('SELECT pg_advisory_lock(6007, hashtext($1))', [scope]);
      if (controller.signal.aborted) throw Error('Write gate connection lost');
      const value = await operation();
      if (controller.signal.aborted) throw Error('Write gate connection lost');
      return value;
    } finally {
      await client.end();
    }
  }
  write<T>(operation: () => Promise<T>, scope?: string) {
    return this.run(false, operation, scope);
  }
  pause<T>(operation: () => Promise<T>) {
    return this.run(true, operation);
  }
}
