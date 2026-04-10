import { Prisma } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';

/**
 * Re-maps well-known Prisma error codes to NestJS HTTP exceptions.
 * Call this in a catch block after any Prisma create/update/delete operation.
 *
 * P2002 — Unique constraint violation  → 409 ConflictException
 * P2025 — Record not found             → 404 NotFoundException
 *
 * All other errors are re-thrown as-is.
 */
export function handlePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        throw new ConflictException('A record with this value already exists.');
      case 'P2025':
        throw new NotFoundException('Record not found.');
    }
  }
  throw err;
}
