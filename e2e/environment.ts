import { resolve } from 'node:path';
import { lstatSync, readFileSync } from 'node:fs';
import { parseConfig } from '../apps/api/src/config.js';

function absent(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function readFailure(error: unknown) {
  const code = error instanceof Error && 'code' in error ? error.code : undefined;
  // Configuration contents, paths and raw native error messages stay private.
  const safeCodes = [
    'ENOENT',
    'EACCES',
    'EPERM',
    'EISDIR',
    'ENOTDIR',
    'ELOOP',
    'EIO',
    'ERR_INVALID_ARG_TYPE',
  ];
  return new Error('Unable to read the optional local E2E environment file.', {
    cause: {
      code: typeof code === 'string' && safeCodes.includes(code) ? code : 'ENV_FILE_READ_FAILED',
    },
  });
}

/** Tests use explicit process values first, with an optional project-local file. */
export function loadE2EEnvironment(file = resolve('.env')) {
  let missing = false;
  try {
    // Node 22's env loader can report ENOENT for an existing unreadable file.
    // Use real filesystem read errors; an existing dangling link is not absence.
    readFileSync(file);
  } catch (error) {
    if (absent(error)) {
      try {
        lstatSync(file);
      } catch (stateError) {
        if (absent(stateError)) missing = true;
        else throw readFailure(stateError);
      }
    }
    if (!missing) throw readFailure(error);
  }
  if (!missing) {
    try {
      // Preserve Node parsing/precedence. Any failure after the successful read
      // rejects, including removal/permission changes before this second read.
      process.loadEnvFile(file);
    } catch (error) {
      throw readFailure(error);
    }
  }
  if (!process.env['DATABASE_URL'])
    throw new Error(
      'E2E configuration requires DATABASE_URL in the process environment or optional local .env file.',
    );
  // Reuse the server's loopback, tileset database name, host and port policy.
  // Validation happens before a Persistence client or browser server is created.
  return parseConfig(process.env);
}
