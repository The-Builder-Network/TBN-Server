import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { stripHtml } from '../../../common/sanitize.helper.js';

export interface JobAnswer {
  question: string;
  answer: string;
}

/** Parse the multipart `answers` field into readable `{question, answer}` pairs. */
function parseAnswers({ value }: { value: unknown }): unknown {
  let v = value;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return value;
    }
  }
  if (!Array.isArray(v)) return value;
  return v
    .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
    .slice(0, 60)
    .map((a) => ({
      question: String(
        stripHtml(typeof a.question === 'string' ? a.question : ''),
      ).slice(0, 300),
      answer: String(
        stripHtml(typeof a.answer === 'string' ? a.answer : ''),
      ).slice(0, 2000),
    }))
    .filter((a) => a.question && a.answer);
}

export class CreateJobDto {
  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  serviceSlug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tradeSlug?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  postcode!: string;

  /** JSON array of { question, answer } from the job funnel. */
  @IsOptional()
  @Transform(parseAnswers)
  answers?: JobAnswer[];

  /** Username of a tradesperson to invite ("Request a quote" from a profile). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  inviteUsername?: string;
}
