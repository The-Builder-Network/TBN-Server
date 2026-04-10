"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UploadsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const url_1 = require("url");
const ALLOWED_UPLOAD_TYPES = [
    { mime: 'image/jpeg', magic: Buffer.from([0xff, 0xd8, 0xff]) },
    { mime: 'image/png', magic: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
    { mime: 'image/webp', magic: Buffer.from([0x52, 0x49, 0x46, 0x46]) },
    { mime: 'application/pdf', magic: Buffer.from([0x25, 0x50, 0x44, 0x46]) },
];
function validateMagicBytes(buffer, declaredMime) {
    const entry = ALLOWED_UPLOAD_TYPES.find((t) => t.mime === declaredMime);
    if (!entry) {
        throw new common_1.BadRequestException(`File type '${declaredMime}' is not permitted`);
    }
    const magic = entry.magic;
    if (buffer.length < magic.length) {
        throw new common_1.BadRequestException('File is too small to be valid');
    }
    for (let i = 0; i < magic.length; i++) {
        if (buffer[i] !== magic[i]) {
            throw new common_1.BadRequestException('File content does not match its declared type');
        }
    }
    if (declaredMime === 'image/webp') {
        if (buffer.length < 12 ||
            buffer.slice(8, 12).toString('ascii') !== 'WEBP') {
            throw new common_1.BadRequestException('File content does not match its declared type');
        }
    }
}
let UploadsService = UploadsService_1 = class UploadsService {
    config;
    logger = new common_1.Logger(UploadsService_1.name);
    s3;
    bucket;
    cdnUrl;
    constructor(config) {
        this.config = config;
        this.s3 = new client_s3_1.S3Client({
            region: config.get('AWS_REGION') ?? 'us-east-1',
            credentials: {
                accessKeyId: config.get('AWS_ACCESS_KEY_ID') ?? '',
                secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY') ?? '',
            },
        });
        this.bucket = config.get('AWS_S3_BUCKET') ?? 'tbn-uploads';
        this.cdnUrl = (config.get('CLOUDFRONT_URL') ?? '').replace(/\/$/, '');
    }
    async uploadFile(fileBuffer, originalName, mimeType, folder = 'uploads') {
        validateMagicBytes(fileBuffer, mimeType);
        const ext = path.extname(originalName).toLowerCase();
        const key = `${folder}/${(0, crypto_1.randomUUID)()}${ext}`;
        try {
            await this.s3.send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: fileBuffer,
                ContentType: mimeType,
            }));
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(`Failed to upload file: ${err.message}`);
        }
        return `${this.cdnUrl}/${key}`;
    }
    async deleteFile(fileUrl) {
        let key;
        try {
            key = new url_1.URL(fileUrl).pathname.replace(/^\//, '');
        }
        catch {
            key = fileUrl.replace(`${this.cdnUrl}/`, '');
        }
        if (!key)
            return;
        try {
            await this.s3.send(new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
        }
        catch (err) {
            this.logger.error('S3 delete failed:', err.message);
        }
    }
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = UploadsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map