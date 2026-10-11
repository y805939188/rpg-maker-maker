import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, fileURLToPath(new URL('../../', import.meta.url)), ''),
    ...process.env,
  };
  const api = Number(env['API_PORT'] ?? 4310);
  const web = Number(env['WEB_PORT'] ?? 5173);
  if (![api, web].every((p) => Number.isInteger(p) && p >= 1024 && p <= 65535) || api === web)
    throw new Error('Invalid local port configuration.');
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: web,
      strictPort: true,
      allowedHosts: [],
      proxy: { '/api': { target: `http://127.0.0.1:${api}`, changeOrigin: true } },
    },
  };
});
