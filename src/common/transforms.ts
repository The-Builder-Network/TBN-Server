import type { TransformFnParams } from 'class-transformer';

/**
 * class-transformer helpers for query/body DTOs.
 * A missing or empty value stays `undefined` so `@IsOptional()` can skip it —
 * `parseInt(String(undefined))` would otherwise yield NaN and fail validation.
 */
export function toInt({ value }: TransformFnParams): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

export function toBool({ value }: TransformFnParams): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}

/** Normalise emails: trim + lowercase (emails are unique case-insensitively). */
export function toEmail({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function toTrimmed({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
