import { NotificationsService } from './notifications.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto.js';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getUnreadCount(user: JwtPayload): Promise<{
        count: number;
    }>;
    getNotifications(user: JwtPayload, query: GetNotificationsQueryDto): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    markRead(user: JwtPayload, id: string): Promise<{
        ok: boolean;
    }>;
    markAllRead(user: JwtPayload): Promise<{
        ok: boolean;
    }>;
}
