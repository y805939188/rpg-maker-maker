import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

export const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
export function loadEnvironment(): void {
  loadDotenv({ path: resolve(repositoryRoot, '.env'), quiet: true, override: false });
}
const port = z.coerce.number().int().min(1024).max(65535);
const schema = z.object({
  API_HOST: z.literal('127.0.0.1').default('127.0.0.1'),
  API_PORT: port.default(4310),
  WEB_PORT: port.default(5173),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z
    .string()
    .url()
    .refine((input) => {
      try {
        const u = new URL(input);
        return (
          ['postgres:', 'postgresql:'].includes(u.protocol) &&
          u.hostname === '127.0.0.1' &&
          /^\/tileset_[a-z0-9_]+$/.test(u.pathname) &&
          u.username.length > 0 &&
          !u.hash &&
          !u.search
        );
      } catch {
        return false;
      }
    }),
});
export type ServerConfig = Readonly<z.infer<typeof schema>>;
export function parseConfig(env: NodeJS.ProcessEnv): ServerConfig {
  const result = schema.safeParse(env);
  if (!result.success || (result.success && result.data.API_PORT === result.data.WEB_PORT)) {
    // Do not print validation input, a connection URL, local paths or credentials.
    throw new Error('Invalid local server configuration. Check the documented .env fields.');
  }
  return Object.freeze(result.data);
}
