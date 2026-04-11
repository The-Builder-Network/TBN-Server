import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    private readonly logger;
    private readonly resend;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService);
    private signTokens;
    private formatUser;
    private generateUsername;
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            role: string;
            name: string;
            username: string | null;
            phone: string | null;
            avatarUrl: string | null;
            emailVerified: boolean;
            createdAt: Date;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            role: string;
            name: string;
            username: string | null;
            phone: string | null;
            avatarUrl: string | null;
            emailVerified: boolean;
            createdAt: Date;
        };
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    getMe(userId: string): Promise<{
        id: string;
        email: string;
        role: string;
        name: string;
        username: string | null;
        phone: string | null;
        avatarUrl: string | null;
        emailVerified: boolean;
        createdAt: Date;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    checkEmail(email: string): Promise<{
        exists: boolean;
    }>;
    checkPhone(phone: string): Promise<{
        exists: boolean;
    }>;
    private sendVerificationEmail;
    private sendPasswordResetEmail;
}
