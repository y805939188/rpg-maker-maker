import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type CorsOptions } from 'vite';
import react from '@vitejs/plugin-react';
import { localWebBoundary } from './dev-boundary.js';
const webRoot = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(webRoot, '../..');
const allowedRoots = [
  webRoot,
  resolve(repositoryRoot, 'packages/contracts/dist'),
  resolve(repositoryRoot, 'node_modules'),
];
export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, fileURLToPath(new URL('../../', import.meta.url)), ''),
    ...process.env,
  };
  const api = Number(env['API_PORT'] ?? 4310);
  const web = Number(env['WEB_PORT'] ?? 5173);
  if (![api, web].every((p) => Number.isInteger(p) && p >= 1024 && p <= 65535) || api === web)
    throw new Error('Invalid local port configuration.');
  const cors: CorsOptions = {
    origin: [`http://127.0.0.1:${web}`],
    // Vite installs CORS before plugin middleware. Preflights must reach the Origin boundary.
    preflightContinue: true,
  };
  return {
    // Assets are imported from src; avoid a second static directory that skips Vite's fs checks.
    publicDir: false,
    plugins: [localWebBoundary(webRoot, allowedRoots, web), react()],
    server: {
      host: '127.0.0.1',
      port: web,
      strictPort: true,
      allowedHosts: [],
      cors,
      fs: {
        strict: true,
        allow: allowedRoots,
        // Preserve Vite 7.3.5 defaults and protect the entire local state tree at every depth.
        deny: [
          '.env',
          '.env.*',
          '*.{crt,pem}',
          '**/.git/**',
          '**/.local',
          '**/.local/**',
          '**/*.key',
        ],
      },
      proxy: { '/api': { target: `http://127.0.0.1:${api}`, changeOrigin: true } },
    },
  };
});
