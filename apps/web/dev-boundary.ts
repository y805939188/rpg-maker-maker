import { realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

const privateSegment = /^(?:\.local|\.git|\.env(?:\..*)?)$|\.(?:pem|crt|key)$/i;
const runtimeIds = new Set(['/@vite/client', '/@vite/env', '/@react-refresh']);
const cleanId = (id: string) => id.replace(/[?#].*$/, '');
function isPrivate(path: string): boolean {
  return path
    .replaceAll('\\', '/')
    .split('/')
    .some((part) => privateSegment.test(part));
}
function within(file: string, root: string): boolean {
  const path = relative(root, file);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith('../'));
}
function isVirtual(id: string): boolean {
  return (
    id.startsWith('\0') || runtimeIds.has(cleanId(id)) || id.startsWith('__vite-browser-external')
  );
}

// Vite 7.3.5 unwraps /@id/ before resolving /@fs/, and load() precedes its filesystem read.
// Authorize that resolved target, never a missing guessed path. Recheck every module load.
export function localWebBoundary(webRoot: string, allowedRoots: string[], port: number): Plugin {
  const origin = `http://127.0.0.1:${port}`;
  let running: ViteDevServer | undefined;
  async function authorized(id: string): Promise<boolean> {
    const file = cleanId(id);
    if (!isAbsolute(file) || isPrivate(file)) return false;
    // Registered optimized deps can be resolved before their bundle is published by Vite.
    const optimizer = running?.environments.client?.depsOptimizer;
    if (optimizer) {
      const entries = [
        ...Object.values(optimizer.metadata.optimized),
        ...Object.values(optimizer.metadata.discovered),
        ...Object.values(optimizer.metadata.chunks),
      ];
      await entries.find((entry) => entry.file === file)?.processing;
    }
    try {
      const target = await realpath(file);
      return !isPrivate(target) && allowedRoots.some((root) => within(target, root));
    } catch {
      return false;
    }
  }
  return {
    name: 'tileset-local-development-boundary',
    enforce: 'pre',
    async load(id) {
      if (!running || isVirtual(id)) return null;
      if (!(await authorized(id))) this.error('Local development module is not allowed.');
      return null;
    },
    configureServer(server) {
      running = server;
      server.middlewares.use((req, res, next) => {
        const deny = () => {
          res.statusCode = 403;
          res.removeHeader('Access-Control-Allow-Origin');
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Local development request is not allowed.');
        };
        if (
          req.headers.host !== `127.0.0.1:${port}` ||
          (req.headers.origin !== undefined && req.headers.origin !== origin) ||
          req.headers['sec-fetch-site'] === 'cross-site' ||
          req.headers['x-forwarded-host'] ||
          req.headers['x-forwarded-for']
        ) {
          deny();
          return;
        }
        let pathname: string;
        let query: string;
        try {
          const url = new URL(req.url ?? '/', origin);
          pathname = decodeURIComponent(url.pathname);
          query = url.search.replace(/(\?|&)import=?(?:&|$)/, '$1').replace(/[?&]$/, '');
          // Reject residual encodings, separators, and backslashes rather than delegate a second decode.
          if (/[\\?#]|%[0-9a-f]{2}/i.test(pathname) || isPrivate(pathname)) {
            deny();
            return;
          }
        } catch {
          deny();
          return;
        }
        const rawPath = (req.url ?? '/').split('?')[0]!;
        if ((rawPath === '/api' || rawPath.startsWith('/api/')) && rawPath === pathname) {
          next();
          return;
        }
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? '')) {
          deny();
          return;
        }
        let effective = pathname.startsWith('/@id/') ? pathname.slice(5) : pathname;
        effective = effective.replace('__x00__', '\0');
        // Nested/filesystem-bearing pseudo-virtual IDs are never genuine virtual modules.
        if (
          effective.includes('/@id/') ||
          (effective.includes('\0') && effective.includes('/@fs/'))
        ) {
          deny();
          return;
        }
        const proceed = () => {
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
          } else next();
        };
        if (runtimeIds.has(effective)) {
          proceed();
          return;
        }
        void (async () => {
          if (effective === '/') {
            if (await authorized(resolve(webRoot, 'index.html'))) proceed();
            else deny();
            return;
          }
          const resolved = await server.environments.client!.pluginContainer.resolveId(
            effective + query,
          );
          if (!resolved || (!isVirtual(resolved.id) && !(await authorized(resolved.id)))) {
            deny();
            return;
          }
          proceed();
        })().catch(deny);
      });
    },
  };
}
