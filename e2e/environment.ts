import { resolve } from 'node:path';
import { parseConfig } from '../apps/api/src/config.js';

/** Tests use explicit process values first, with an optional project-local file. */
export function loadE2EEnvironment(file = resolve('.env')) {
  try {
    process.loadEnvFile(file);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
      throw new Error('Unable to read the optional local E2E environment file.', { cause: error });
  }
  if (!process.env['DATABASE_URL'])
    throw new Error(
      'E2E configuration requires DATABASE_URL in the process environment or optional local .env file.',
    );
  // Reuse the server's loopback, tileset database name, host and port policy.
  // Validation happens before a Persistence client or browser server is created.
  return parseConfig(process.env);
}
