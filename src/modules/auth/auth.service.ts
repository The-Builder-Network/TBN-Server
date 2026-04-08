import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly resend: Resend | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  // ── Token helpers ────────────────────────────────────────────

  private signTokens(userId: string, email: string, role: string) {
    const secret = this.config.get<string>('JWT_SECRET')!;
    const accessToken = this.jwt.sign(
      { sub: userId, email, role },
      { secret, expiresIn: '15m' },
    );
    const refreshToken = this.jwt.sign(
      { sub: userId, type: 'refresh' },
      { secret, expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }

  private formatUser(user: {
    id: string;
    email: string;
    role: string;
    name: string;
    phone: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
    createdAt: Date;
  }) {
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

  // ── Register ─────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerifyToken = randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        phone: dto.phone,
        role: dto.role as any,
        emailVerifyToken,
        ...(dto.role === 'TRADESPERSON'
          ? {
              tradespersonProfile: {
                create: {
                  username: dto.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + randomBytes(3).toString('hex'),
                },
              },
              leadCredit: {
                create: { balance: 0 },
              },
            }
          : {}),
      },
    });

    // Send verification email (fire-and-forget)
    void this.sendVerificationEmail(user.email, emailVerifyToken);

    const tokens = this.signTokens(user.id, user.email, user.role);
    return { user: this.formatUser(user), ...tokens };
  }

  // ── Login ────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = this.signTokens(user.id, user.email, user.role);
    return { user: this.formatUser(user), ...tokens };
  }

  // ── Refresh ──────────────────────────────────────────────────

  async refresh(refreshToken: string) {
    const secret = this.config.get<string>('JWT_SECRET')!;
    let payload: { sub: string; type?: string };
    try {
      payload = this.jwt.verify(refreshToken, { secret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.signTokens(user.id, user.email, user.role);
  }

  // ── Me ───────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.formatUser(user);
  }

  // ── Forgot Password ──────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return same message to prevent email enumeration
    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const token = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });

    void this.sendPasswordResetEmail(user.email, token);

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  // ── Reset Password ───────────────────────────────────────────

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
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

  // ── Verify Email ─────────────────────────────────────────────

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });
    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null },
    });

    return { message: 'Email verified.' };
  }

  // ── Email helpers ────────────────────────────────────────────

  private async sendVerificationEmail(email: string, token: string) {
    if (!this.resend) return;
    const url = `${this.config.get('FRONTEND_URL')}/verify-email?token=${token}`;
    try {
      await this.resend.emails.send({
        from: 'noreply@buildernetwork.co.uk',
        to: email,
        subject: 'Verify your Builder Network email',
        html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
      });
    } catch (err) {
      console.error('Failed to send verification email:', err);
    }
  }

  private async sendPasswordResetEmail(email: string, token: string) {
    if (!this.resend) return;
    const url = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;
    try {
      await this.resend.emails.send({
        from: 'noreply@buildernetwork.co.uk',
        to: email,
        subject: 'Reset your Builder Network password',
        html: `<p>Click <a href="${url}">here</a> to reset your password. This link expires in 1 hour.</p>`,
      });
    } catch (err) {
      console.error('Failed to send reset email:', err);
    }
  }
}
