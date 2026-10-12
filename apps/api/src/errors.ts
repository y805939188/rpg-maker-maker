import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import type { ApiError } from '@tileset/contracts';

export function safeError(exception: unknown): { status: number; body: ApiError } {
  let status = exception instanceof HttpException ? exception.getStatus() : 500;
  if (
    exception instanceof Prisma.PrismaClientKnownRequestError ||
    exception instanceof Prisma.PrismaClientInitializationError
  )
    status = 503;
  // Body parser errors are outside Nest and may contain the rejected body.
  if (typeof exception === 'object' && exception !== null && 'type' in exception) {
    if (exception.type === 'entity.too.large') status = 413;
    if (exception.type === 'entity.parse.failed') status = 400;
    if (exception.type === 'encoding.unsupported' || exception.type === 'charset.unsupported')
      status = 415;
  }
  const responses: Record<number, ApiError['error']> = {
    400: { code: 'INVALID_REQUEST', message: 'Request does not match the HTTP contract.' },
    403: { code: 'FORBIDDEN', message: 'Request is not allowed.' },
    404: { code: 'NOT_FOUND', message: 'Requested resource was not found.' },
    413: { code: 'PAYLOAD_TOO_LARGE', message: 'JSON request exceeds the 8 KiB limit.' },
    415: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Only JSON requests are supported.' },
    503: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Local database is unavailable. Check the local service.',
    },
  };
  if (!responses[status]) status = 500;
  return {
    status,
    body: {
      error: responses[status] ?? {
        code: 'INTERNAL_ERROR',
        message: 'The local service could not complete the request.',
      },
    },
  };
}
@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, body } = safeError(exception);
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }
}
