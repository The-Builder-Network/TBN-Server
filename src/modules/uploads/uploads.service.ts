import {
  Injectable,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';

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
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID') ?? '';
    const endpoint =
      config.get<string>('R2_ENDPOINT') ??
      `https://${accountId}.r2.cloudflarestorage.com`;

    this.s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID') ?? '',
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY') ?? '',
      },
    });

    this.bucket = config.get<string>('R2_BUCKET_NAME') ?? 'tbn-uploads';
    this.publicUrl = config.get<string>('R2_PUBLIC_URL') ?? '';
  }

  /**
   * Upload a single file buffer to Cloudflare R2.
   * Returns the public URL of the uploaded file.
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'uploads',
  ): Promise<string> {
    // Validate magic bytes before uploading
    validateMagicBytes(fileBuffer, mimeType);

    const ext = path.extname(originalName).toLowerCase();
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
      throw new InternalServerErrorException(
        `Failed to upload file: ${(err as Error).message}`,
      );
    }

    return `${this.publicUrl}/${key}`;
  }

  /**
   * Delete a file from R2 by its public URL.
   */
  async deleteFile(publicFileUrl: string): Promise<void> {
    const key = publicFileUrl.replace(`${this.publicUrl}/`, '');
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (err) {
      // Log but don't throw — deletion failures are not fatal
      this.logger.error('R2 delete failed:', (err as Error).message);
    }
  }
}
