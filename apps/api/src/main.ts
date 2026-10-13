import { createApplication } from './app.js';
import { loadEnvironment, parseConfig } from './config.js';

loadEnvironment();
let running: Awaited<ReturnType<typeof createApplication>> | undefined;
try {
  const config = parseConfig(process.env);
  running = await createApplication(config);
  const server = running.app.getHttpServer() as import('node:http').Server;
  server.headersTimeout = 5000;
  server.requestTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.maxConnections = 16;
  await running.app.listen(config.API_PORT, config.API_HOST);
  console.log(
    `AI Tileset Studio (${config.NODE_ENV}) ready at http://127.0.0.1:${config.API_PORT}`,
  );
  let closing = false;
  const stop = () => {
    if (closing) return;
    closing = true;
    void running!
      .close()
      .then(() => {
        process.exitCode = 0;
      })
      .catch(() => {
        process.exitCode = 1;
      });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
} catch {
  if (running) await running.close();
  console.error(
    'Local startup failed. Check configuration, database migrations and production build.',
  );
  process.exitCode = 1;
}
