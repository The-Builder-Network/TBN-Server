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
export declare class NotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createNotification(data: CreateNotificationData): Promise<{
        type: import("@prisma/client").$Enums.NotificationType;
        id: string;
        createdAt: Date;
        body: string | null;
        userId: string;
        title: string;
        linkUrl: string | null;
        read: boolean;
    }>;
    getNotifications(userId: string, query: GetNotificationsQueryDto): Promise<{
        data: {
            id: string;
            type: import("@prisma/client").$Enums.NotificationType;
            title: string;
            body: string | undefined;
            linkUrl: string | undefined;
            read: boolean;
            createdAt: string;
        }[];
        meta: {
            total: number;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    getUnreadCount(userId: string): Promise<{
        count: number;
    }>;
    markRead(notificationId: string, userId: string): Promise<void>;
    markAllRead(userId: string): Promise<void>;
}
