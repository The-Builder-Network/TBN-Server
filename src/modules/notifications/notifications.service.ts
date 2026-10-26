import { Injectable, Logger } from '@nestjs/common';
import type { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../../common/mail.service.js';
import { NotificationGateway } from './notification.gateway.js';
import type { GetNotificationsQueryDto } from './dto/get-notifications-query.dto.js';

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
  /** Also email the user (skipped if they paused notifications or the account is closed). */
  email?: {
    subject: string;
    heading?: string;
    paragraphs: string[];
    ctaLabel?: string;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
    private readonly mail: MailService,
  ) {}

  /**
   * Persist an in-app notification, push it over the socket and optionally email it.
   * Call after the triggering transaction commits; failures are logged, never thrown.
   */
  async notify(input: NotifyInput): Promise<void> {
    try {
      const n = await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          linkUrl: input.linkUrl ?? null,
        },
      });
      this.gateway.sendNotificationToUser(input.userId, {
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        linkUrl: n.linkUrl,
      });

      if (input.email) {
        const user = await this.prisma.user.findUnique({
          where: { id: input.userId },
          select: {
            email: true,
            notificationsPaused: true,
            accountStatus: true,
          },
        });
        if (
          user &&
          !user.notificationsPaused &&
          user.accountStatus === 'ACTIVE'
        ) {
          await this.mail.send({
            to: user.email,
            subject: input.email.subject,
            heading: input.email.heading ?? input.title,
            paragraphs: input.email.paragraphs,
            cta: input.linkUrl
              ? {
                  label: input.email.ctaLabel ?? 'View on The Builder Network',
                  url: this.mail.link(input.linkUrl),
                }
              : undefined,
          });
        }
      }
    } catch (err) {
      this.logger.error(
        `notify(${input.type}) for ${input.userId} failed: ${(err as Error).message}`,
      );
    }
  }

  async notifyMany(inputs: NotifyInput[]): Promise<void> {
    await Promise.all(inputs.map((i) => this.notify(i)));
  }

  async getNotifications(userId: string, query: GetNotificationsQueryDto) {
    const { page = 1, perPage = 20, unreadOnly = false } = query;
    const where = { userId, ...(unreadOnly ? { read: false } : {}) };

    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return {
      data: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body ?? undefined,
        linkUrl: n.linkUrl ?? undefined,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
