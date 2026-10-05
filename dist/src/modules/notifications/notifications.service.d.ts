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
    createNotification(data: CreateNotificationData): Promise<any>;
    getNotifications(userId: string, query: GetNotificationsQueryDto): Promise<{
        data: any;
        meta: {
            total: any;
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
