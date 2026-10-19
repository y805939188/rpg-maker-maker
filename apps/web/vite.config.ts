import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type CorsOptions, type Plugin } from 'vite';
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
  const launch = env['TILESET_STARTUP_LAUNCH'];
  const listening: Plugin = {
    name: 'owned-startup-listener',
    apply: 'serve',
    configureServer(server) {
      if (!launch || !/^[a-f0-9]{32}$/.test(launch)) return;
      server.httpServer?.once('listening', () => {
        const bound = server.httpServer?.address();
        if (
          bound &&
          typeof bound !== 'string' &&
          bound.address === '127.0.0.1' &&
          bound.port === web
        )
          console.log(`[local-listening:${launch}:web:${bound.port}]`);
      });
    },
  };
  return {
    // Assets are imported from src; avoid a second static directory that skips Vite's fs checks.
    publicDir: false,
    plugins: [localWebBoundary(webRoot, allowedRoots, web), react(), listening],
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
