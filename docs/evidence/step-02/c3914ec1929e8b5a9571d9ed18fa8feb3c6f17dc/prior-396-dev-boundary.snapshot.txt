import { realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import type { Plugin } from 'vite';

const privateSegment = /^(?:\.local|\.git|\.env(?:\..*)?)$|\.(?:pem|crt|key)$/i;
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

// Runs before Vite's static and transform handlers, including raw/import query variants.
// The real path check also excludes private targets reached through an allowed-tree symlink.
export function localWebBoundary(webRoot: string, allowedRoots: string[], port: number): Plugin {
  const origin = `http://127.0.0.1:${port}`;
  return {
    name: 'tileset-local-development-boundary',
    configureServer(server) {
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
        try {
          pathname = decodeURIComponent(new URL(req.url ?? '/', origin).pathname);
        } catch {
          deny();
          return;
        }
        if (isPrivate(pathname)) {
          deny();
          return;
        }
        if (req.method === 'OPTIONS' && !pathname.startsWith('/api')) {
          res.statusCode = 204;
          res.end();
          return;
        }
        const candidate = pathname.startsWith('/@fs/')
          ? resolve('/', pathname.slice(5))
          : resolve(webRoot, '.' + pathname);
        void realpath(candidate)
          .then((file) => {
            if (isPrivate(file) || !allowedRoots.some((root) => within(file, root))) deny();
            else next();
          })
          .catch((error: unknown) => {
            // Virtual modules and app routes need Vite's normal resolver; unreadable files fail closed.
            if (
              typeof error === 'object' &&
              error !== null &&
              'code' in error &&
              error.code === 'ENOENT'
            )
              next();
            else deny();
          });
      });
    },
  };
}
