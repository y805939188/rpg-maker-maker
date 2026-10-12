import { resolve } from 'node:path';
import { Persistence, backup, restore } from '@tileset/persistence';
import { PROFILE } from '../src/profile.js';
// Credentials come from the process environment only: use node --env-file=.env for local CLI.
const url = process.env['DATABASE_URL'];
if (!url) throw Error('Dedicated database configuration required');
const action = process.argv[2],
  name = process.argv[3];
if (!name || !/^[a-z][a-z0-9-]{0,63}$/.test(name))
  throw Error('A new local backup name is required');
const root = resolve('.local/assets'),
  output = resolve('.local/step06/backups', name),
  pgBin = process.env['TILESET_PG_BIN'] ?? '/opt/homebrew/opt/postgresql@14/bin';
const store = new Persistence(url, root, PROFILE);
try {
  if (action === 'backup') console.log(JSON.stringify(await backup(store, output, pgBin)));
  else if (action === 'restore') console.log(JSON.stringify(await restore(store, output, pgBin)));
  else throw Error('Use backup or restore');
} finally {
  await store.close();
}
