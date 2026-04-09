import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID') ?? '';
    const endpoint = config.get<string>('R2_ENDPOINT') ??
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
      console.error('R2 delete failed:', (err as Error).message);
    }
  }
}
