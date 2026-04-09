import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { NotificationType } from '@prisma/client';
import type { GetNotificationsQueryDto } from './dto/get-notifications-query.dto.js';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create notification (called by other services) ─────────────────────────

  async createNotification(data: CreateNotificationData) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        linkUrl: data.linkUrl ?? null,
        read: false,
      },
    });
  }

  // ── GET /notifications ─────────────────────────────────────────────────────

  async getNotifications(userId: string, query: GetNotificationsQueryDto) {
    const { page = 1, perPage = 20, unreadOnly = false } = query;

    const where = {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    };

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
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  // ── GET /notifications/unread-count ────────────────────────────────────────

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  // ── PATCH /notifications/:id/read ──────────────────────────────────────────

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  // ── POST /notifications/read-all ──────────────────────────────────────────

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
