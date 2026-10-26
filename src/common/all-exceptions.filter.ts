import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/**
 * Global error shape: `{ statusCode, message, error?, ...extra }`.
 * HttpExceptions pass through unchanged (so custom payloads like
 * INSUFFICIENT_CREDITS keep their fields); Prisma errors become 4xx instead
 * of opaque 500s; anything else is logged and returned as a generic 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    // Websocket/other contexts: let Nest handle them.
    if (host.getType() !== 'http') throw exception;
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res
        .status(status)
        .json(
          typeof body === 'string'
            ? { statusCode: status, message: body }
            : body,
        );
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const map: Record<string, [number, string]> = {
        P2002: [
          HttpStatus.CONFLICT,
          'A record with this value already exists.',
        ],
        P2025: [HttpStatus.NOT_FOUND, 'Record not found.'],
        P2003: [HttpStatus.BAD_REQUEST, 'Related record does not exist.'],
        P2034: [
          HttpStatus.CONFLICT,
          'This action conflicted with another update. Please try again.',
        ],
      };
      const hit = map[exception.code];
      if (hit) {
        res.status(hit[0]).json({ statusCode: hit[0], message: hit[1] });
        return;
      }
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.warn(`Invalid query on ${req.method} ${req.url}`);
      res
        .status(HttpStatus.BAD_REQUEST)
        .json({ statusCode: 400, message: 'Invalid request.' });
      return;
    }

    this.logger.error(
      `Unhandled error on ${req.method} ${req.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message: 'Something went wrong. Please try again.',
    });
  }
}
