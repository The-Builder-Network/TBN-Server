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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcryptjs"));
const crypto_1 = require("crypto");
const resend_1 = require("resend");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
const prisma_error_helper_js_1 = require("../../common/prisma-error.helper.js");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwt;
    config;
    logger = new common_1.Logger(AuthService_1.name);
    resend;
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        const apiKey = config.get('RESEND_API_KEY');
        this.resend = apiKey ? new resend_1.Resend(apiKey) : null;
    }
    signTokens(userId, email, role) {
        const secret = this.config.get('JWT_SECRET');
        const accessToken = this.jwt.sign({ sub: userId, email, role }, { secret, expiresIn: '15m' });
        const refreshToken = this.jwt.sign({ sub: userId, type: 'refresh' }, { secret, expiresIn: '7d' });
        return { accessToken, refreshToken };
    }
    formatUser(user) {
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
        };
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException('Email already in use');
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const emailVerifyToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const user = await this.prisma.user
            .create({
            data: {
                email: dto.email,
                passwordHash,
                name: dto.name,
                phone: dto.phone,
                role: dto.role,
                emailVerifyToken,
                ...(dto.role === 'TRADESPERSON'
                    ? {
                        tradespersonProfile: {
                            create: {
                                username: dto.email
                                    .split('@')[0]
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]/g, '') +
                                    '-' +
                                    (0, crypto_1.randomBytes)(3).toString('hex'),
                            },
                        },
                        leadCredit: {
                            create: { balance: 0 },
                        },
                    }
                    : {}),
            },
        })
            .catch(prisma_error_helper_js_1.handlePrismaError);
        void this.sendVerificationEmail(user.email, emailVerifyToken);
        const tokens = this.signTokens(user.id, user.email, user.role);
        return { user: this.formatUser(user), ...tokens };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const tokens = this.signTokens(user.id, user.email, user.role);
        return { user: this.formatUser(user), ...tokens };
    }
    async refresh(refreshToken) {
        const secret = this.config.get('JWT_SECRET');
        let payload;
        try {
            payload = this.jwt.verify(refreshToken, { secret });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        if (payload.type !== 'refresh') {
            throw new common_1.UnauthorizedException('Invalid token type');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return this.signTokens(user.id, user.email, user.role);
    }
    async getMe(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException();
        return this.formatUser(user);
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return { message: 'If that email exists, a reset link has been sent.' };
        }
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiry = new Date(Date.now() + 60 * 60 * 1000);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { passwordResetToken: token, passwordResetExpiry: expiry },
        });
        void this.sendPasswordResetEmail(user.email, token);
        return { message: 'If that email exists, a reset link has been sent.' };
    }
    async resetPassword(token, newPassword) {
        const user = await this.prisma.user.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpiry: { gt: new Date() },
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpiry: null,
            },
        });
        return { message: 'Password updated.' };
    }
    async verifyEmail(token) {
        const user = await this.prisma.user.findFirst({
            where: { emailVerifyToken: token },
        });
        if (!user) {
            throw new common_1.BadRequestException('Invalid verification token');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true, emailVerifyToken: null },
        });
        return { message: 'Email verified.' };
    }
    async checkEmail(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        return { exists: !!user };
    }
    async checkPhone(phone) {
        const user = await this.prisma.user.findFirst({ where: { phone } });
        return { exists: !!user };
    }
    async sendVerificationEmail(email, token) {
        if (!this.resend)
            return;
        const url = `${this.config.get('FRONTEND_URL')}/verify-email?token=${token}`;
        try {
            await this.resend.emails.send({
                from: 'noreply@buildernetwork.co.uk',
                to: email,
                subject: 'Verify your Builder Network email',
                html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
            });
        }
        catch (err) {
            this.logger.error('Failed to send verification email:', err);
        }
    }
    async sendPasswordResetEmail(email, token) {
        if (!this.resend)
            return;
        const url = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;
        try {
            await this.resend.emails.send({
                from: 'noreply@buildernetwork.co.uk',
                to: email,
                subject: 'Reset your Builder Network password',
                html: `<p>Click <a href="${url}">here</a> to reset your password. This link expires in 1 hour.</p>`,
            });
        }
        catch (err) {
            this.logger.error('Failed to send reset email:', err);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map