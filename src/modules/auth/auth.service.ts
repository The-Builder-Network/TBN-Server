import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../../common/mail.service.js';
import { CreditsService, WELCOME_CREDITS } from '../credits/credits.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

const EMAIL_VERIFY_TTL_MS = 48 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
// Compared against when the email is unknown, so login timing doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 12);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly credits: CreditsService,
  ) {}

  // ── Tokens ──────────────────────────────────────────────────

  signTokens(user: Pick<User, 'id' | 'email' | 'role' | 'tokenVersion'>) {
    const secret = this.config.get<string>('JWT_SECRET')!;
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { secret, expiresIn: '15m' },
    );
    const refreshToken = this.jwt.sign(
      { sub: user.id, type: 'refresh', tv: user.tokenVersion },
      { secret, expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }

  async formatUser(user: User) {
    const profile =
      user.role === 'TRADESPERSON'
        ? await this.prisma.tradespersonProfile.findUnique({
            where: { userId: user.id },
            select: { verificationStatus: true },
          })
        : null;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      username: user.username,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      marketingOptIn: user.marketingOptIn,
      notificationsPaused: user.notificationsPaused,
      verificationStatus: profile?.verificationStatus ?? null,
      createdAt: user.createdAt,
    };
  }

  private async generateUsername(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 30) || 'user';
    for (let n = 1; n < 1000; n++) {
      const candidate = n === 1 ? base : `${base}${n}`;
      const taken = await this.prisma.user.findUnique({
        where: { username: candidate },
      });
      if (!taken) return candidate;
    }
    return `${base}${randomBytes(3).toString('hex')}`;
  }

  // ── Register ────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing)
      throw new ConflictException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerifyToken = randomBytes(32).toString('hex');
    const username = await this.generateUsername(dto.name);
    const isTrade = dto.role === 'TRADESPERSON';

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
          username,
          phone: dto.phone,
          role: dto.role,
          emailVerifyToken,
          emailVerifyExpiry: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
          marketingOptIn: dto.marketingOptIn ?? false,
          marketingOptInAt: dto.marketingOptIn ? new Date() : null,
          ...(isTrade ? { tradespersonProfile: { create: { username } } } : {}),
        },
      });
      if (isTrade && WELCOME_CREDITS > 0) {
        await this.credits.grant(
          tx,
          created.id,
          WELCOME_CREDITS,
          'WELCOME_BONUS',
          {
            note: 'Welcome credits',
          },
        );
      }
      return created;
    });

    void this.sendVerificationEmail(user.email, user.name, emailVerifyToken);

    return { user: await this.formatUser(user), ...this.signTokens(user) };
  }

  // ── Login / refresh / me ────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    const valid = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !valid || user.accountStatus === 'DELETED') {
      throw new UnauthorizedException('Invalid email or password');
    }
    this.assertNotSuspended(user);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return {
      user: await this.formatUser(updated),
      ...this.signTokens(updated),
    };
  }

  async refresh(refreshToken: string) {
    const secret = this.config.get<string>('JWT_SECRET')!;
    let payload: { sub: string; type?: string; tv?: number };
    try {
      payload = this.jwt.verify(refreshToken, { secret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh')
      throw new UnauthorizedException('Invalid token type');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (
      !user ||
      user.accountStatus !== 'ACTIVE' ||
      (payload.tv ?? 0) !== user.tokenVersion
    ) {
      throw new UnauthorizedException('Session expired, please log in again');
    }
    return this.signTokens(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus === 'DELETED')
      throw new UnauthorizedException();
    this.assertNotSuspended(user);
    return this.formatUser(user);
  }

  private assertNotSuspended(user: User) {
    if (user.accountStatus === 'SUSPENDED') {
      throw new ForbiddenException(
        'Your account has been suspended. Please contact support@thebuildernetwork.com.',
      );
    }
  }

  // ── Passwords ───────────────────────────────────────────────

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Your current password is incorrect');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'Choose a password you have not used for this account',
      );
    }
    // Bumping tokenVersion signs out every other device; this one gets fresh tokens.
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        tokenVersion: { increment: 1 },
      },
    });
    return { message: 'Password updated.', ...this.signTokens(updated) };
  }

  async forgotPassword(email: string) {
    const generic = {
      message: 'If that email exists, a reset link has been sent.',
    };
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.accountStatus !== 'ACTIVE') return generic;

    const token = randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpiry: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });
    void this.mail.send({
      to: user.email,
      subject: 'Reset your Builder Network password',
      heading: 'Reset your password',
      paragraphs: [
        `Hi ${user.name},`,
        'We received a request to reset your password. This link expires in 1 hour.',
        "If you didn't ask for this, you can ignore this email.",
      ],
      cta: {
        label: 'Reset password',
        url: this.mail.link(`/reset-password?token=${token}`),
      },
    });
    return generic;
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    });
    if (!user)
      throw new BadRequestException(
        'This reset link is invalid or has expired',
      );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        passwordResetToken: null,
        passwordResetExpiry: null,
        tokenVersion: { increment: 1 },
      },
    });
    return { message: 'Password updated. Please log in.' };
  }

  // ── Email verification ──────────────────────────────────────

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });
    if (!user)
      throw new BadRequestException('This verification link is invalid');
    if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
      throw new BadRequestException(
        'This verification link has expired. Request a new one.',
      );
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });
    return { message: 'Email verified.' };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.emailVerified)
      return { message: 'Your email is already verified.' };

    const token = randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifyToken: token,
        emailVerifyExpiry: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
      },
    });
    void this.sendVerificationEmail(user.email, user.name, token);
    return { message: 'Verification email sent.' };
  }

  private sendVerificationEmail(email: string, name: string, token: string) {
    return this.mail.send({
      to: email,
      subject: 'Verify your Builder Network email',
      heading: 'Confirm your email address',
      paragraphs: [
        `Hi ${name},`,
        'Please confirm your email address to finish setting up your account.',
      ],
      cta: {
        label: 'Verify email',
        url: this.mail.link(`/verify-email?token=${token}`),
      },
    });
  }

  // ── Availability checks (sign-up forms) ─────────────────────

  async checkEmail(email: string): Promise<{ exists: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return { exists: !!user };
  }

  async checkPhone(phone: string): Promise<{ exists: boolean }> {
    const user = await this.prisma.user.findFirst({
      where: { phone, accountStatus: { not: 'DELETED' } },
      select: { id: true },
    });
    return { exists: !!user };
  }
}
