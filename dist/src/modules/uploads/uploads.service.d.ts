import { ConfigService } from '@nestjs/config';
export declare class UploadsService {
    private readonly config;
    private readonly s3;
    private readonly bucket;
    private readonly publicUrl;
    constructor(config: ConfigService);
    uploadFile(fileBuffer: Buffer, originalName: string, mimeType: string, folder?: string): Promise<string>;
    deleteFile(publicFileUrl: string): Promise<void>;
}
