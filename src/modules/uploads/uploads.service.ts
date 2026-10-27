import {
  Injectable,
  InternalServerErrorException,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import type { Readable } from 'stream';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { URL } from 'url';

/** S3 error names meaning "our AWS credentials were refused", not a transient fault. */
const CREDENTIAL_ERRORS = new Set([
  'AccessDenied',
  'InvalidAccessKeyId',
  'SignatureDoesNotMatch',
  'ExpiredToken',
  'InvalidToken',
]);

// ── Allowed upload MIME types and their magic byte signatures ───────────────
const ALLOWED_UPLOAD_TYPES: { mime: string; magic: Buffer }[] = [
  { mime: 'image/jpeg', magic: Buffer.from([0xff, 0xd8, 0xff]) },
  { mime: 'image/png', magic: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
  { mime: 'image/webp', magic: Buffer.from([0x52, 0x49, 0x46, 0x46]) }, // RIFF…WEBP
  { mime: 'application/pdf', magic: Buffer.from([0x25, 0x50, 0x44, 0x46]) }, // %PDF
];

function validateMagicBytes(buffer: Buffer, declaredMime: string): void {
  const entry = ALLOWED_UPLOAD_TYPES.find((t) => t.mime === declaredMime);
  if (!entry) {
    throw new BadRequestException(
      `File type '${declaredMime}' is not permitted`,
    );
  }
  const magic = entry.magic;
  if (buffer.length < magic.length) {
    throw new BadRequestException('File is too small to be valid');
  }
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) {
      throw new BadRequestException(
        'File content does not match its declared type',
      );
    }
  }
  // Extra WebP check: bytes 8-11 must read 'WEBP'
  if (declaredMime === 'image/webp') {
    if (
      buffer.length < 12 ||
      buffer.slice(8, 12).toString('ascii') !== 'WEBP'
    ) {
      throw new BadRequestException(
        'File content does not match its declared type',
      );
    }
  }
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cdnUrl: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get<string>('AWS_REGION') ?? 'us-east-1',
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });

    this.bucket = config.get<string>('AWS_S3_BUCKET') ?? 'tbn-uploads';
    this.cdnUrl = (config.get<string>('CLOUDFRONT_URL') ?? '').replace(
      /\/$/,
      '',
    ); // strip trailing slash
  }

  /**
   * Upload a single file buffer to AWS S3.
   * Returns the CloudFront CDN URL of the uploaded file.
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'uploads',
  ): Promise<string> {
    // Validate magic bytes before uploading
    validateMagicBytes(fileBuffer, mimeType);

    const ext = path
      .extname(originalName)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '');
    const key = `${folder}/${randomUUID()}${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType,
        }),
      );
    } catch (err) {
      throw this.storageError(err, 'upload', key);
    }

    return `${this.cdnUrl}/${key}`;
  }

  /**
   * Upload a sensitive file (e.g. ID documents) under the `private/` prefix.
   * Returns the S3 key only — never a public URL. Read it back with getPrivate().
   * Infra note: the CloudFront distribution must not serve the `private/*` path.
   */
  async uploadPrivate(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string,
  ): Promise<string> {
    validateMagicBytes(fileBuffer, mimeType);
    const ext = path
      .extname(originalName)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '');
    const key = `private/${folder}/${randomUUID()}${ext}`;
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType,
          ContentDisposition: 'inline',
        }),
      );
    } catch (err) {
      throw this.storageError(err, 'upload', key);
    }
    return key;
  }

  /**
   * Read a private object so the API can stream it to an authorised caller.
   * Errors carry admin-facing explanations (only admin routes read private files).
   */
  async getPrivate(key: string) {
    try {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        stream: res.Body as Readable,
        contentType: res.ContentType ?? 'application/octet-stream',
        contentLength: res.ContentLength,
      };
    } catch (err) {
      throw this.storageError(err, 'read', key, true);
    }
  }

  /**
   * Turn an S3 failure into an HTTP error with a useful message and log the real
   * cause. `detailed` adds operator guidance (only for admin routes).
   */
  private storageError(
    err: unknown,
    action: 'upload' | 'read',
    key: string,
    detailed = false,
  ) {
    const name = (err as { name?: string }).name ?? 'UnknownError';
    const message = (err as Error).message;
    if (name === 'NoSuchKey' || name === 'NotFound') {
      return new NotFoundException('This file is no longer in storage.');
    }
    if (CREDENTIAL_ERRORS.has(name)) {
      this.logger.error(
        `S3 ${action} of ${key} refused (${name}): ${message}. ` +
          'Check the IAM user behind AWS_ACCESS_KEY_ID: the key may be disabled, deleted or quarantined.',
      );
      return new ServiceUnavailableException(
        detailed
          ? `File storage refused our AWS credentials (${name}). AWS may have disabled or quarantined the access key. ` +
              'Create a new key in IAM, update AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, then restart the API.'
          : 'File storage is unavailable right now. Please try again later.',
      );
    }
    this.logger.error(`S3 ${action} of ${key} failed (${name}): ${message}`);
    return new InternalServerErrorException(
      action === 'upload'
        ? 'We could not save your file. Please try again.'
        : 'Could not load the file from storage. Please try again.',
    );
  }

  async deletePrivate(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      this.logger.error('S3 delete failed:', (err as Error).message);
    }
  }

  /**
   * Delete a file from S3 by its CloudFront CDN URL or S3 key.
   */
  async deleteFile(fileUrl: string): Promise<void> {
    let key: string;
    try {
      // Extract the path component from a full URL (works for both CF and S3 URLs)
      key = new URL(fileUrl).pathname.replace(/^\//, '');
    } catch {
      // Fallback: treat as raw key
      key = fileUrl.replace(`${this.cdnUrl}/`, '');
    }

    if (!key) return;

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (err) {
      // Log but don't throw — deletion failures are not fatal
      this.logger.error('S3 delete failed:', (err as Error).message);
    }
  }
}
