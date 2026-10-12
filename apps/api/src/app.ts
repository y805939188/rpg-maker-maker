import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import { WriteGate } from '@tileset/persistence';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { repositoryRoot, type ServerConfig } from './config.js';
import { ProjectsController } from './projects.js';
import { localRequestBoundary } from './security.js';
import { SafeExceptionFilter, safeError } from './errors.js';

export async function createApplication(config: ServerConfig) {
  const db = new PrismaClient({ datasources: { db: { url: config.DATABASE_URL } }, log: [] });
  const server = express();
  server.disable('x-powered-by');
  server.set('trust proxy', false);
  server.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'"],
          'connect-src': ["'self'"],
          'img-src': ["'self'", 'data:', 'blob:'],
          'upgrade-insecure-requests': null,
        },
      },
      strictTransportSecurity: false,
    }),
  );
  server.use(localRequestBoundary(config));
  server.use(express.json({ limit: '8kb', strict: true, inflate: false }));
  @Module({
    controllers: [ProjectsController],
    providers: [
      { provide: PrismaClient, useValue: db },
      { provide: WriteGate, useValue: new WriteGate(config.DATABASE_URL) },
    ],
  })
  class AppModule {}
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: false,
    bodyParser: false,
    abortOnError: false,
  });
  app.useGlobalFilters(new SafeExceptionFilter());
  try {
    await db.$connect();
    if (config.NODE_ENV === 'production') {
      const web = resolve(repositoryRoot, 'apps/web/dist');
      if (!existsSync(resolve(web, 'index.html')))
        throw new Error('Production Web build is missing.');
      server.use(express.static(web, { index: 'index.html', dotfiles: 'deny', fallthrough: true }));
    }
    await app.init();
    const parserErrors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
      const { status, body } = safeError(error);
      res.status(status).json(body);
    };
    server.use(parserErrors);
    const close = async () => {
      await app.close();
      await db.$disconnect();
    };
    return { app, db, close };
  } catch (error) {
    await app.close();
    await db.$disconnect();
    throw error;
  }
}
