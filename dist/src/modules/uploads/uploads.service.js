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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
let UploadsService = class UploadsService {
    config;
    s3;
    bucket;
    publicUrl;
    constructor(config) {
        this.config = config;
        const accountId = config.get('R2_ACCOUNT_ID') ?? '';
        const endpoint = config.get('R2_ENDPOINT') ??
            `https://${accountId}.r2.cloudflarestorage.com`;
        this.s3 = new client_s3_1.S3Client({
            region: 'auto',
            endpoint,
            credentials: {
                accessKeyId: config.get('R2_ACCESS_KEY_ID') ?? '',
                secretAccessKey: config.get('R2_SECRET_ACCESS_KEY') ?? '',
            },
        });
        this.bucket = config.get('R2_BUCKET_NAME') ?? 'tbn-uploads';
        this.publicUrl = config.get('R2_PUBLIC_URL') ?? '';
    }
    async uploadFile(fileBuffer, originalName, mimeType, folder = 'uploads') {
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
        return `${this.publicUrl}/${key}`;
    }
    async deleteFile(publicFileUrl) {
        const key = publicFileUrl.replace(`${this.publicUrl}/`, '');
        try {
            await this.s3.send(new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
        }
        catch (err) {
            console.error('R2 delete failed:', err.message);
        }
    }
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map