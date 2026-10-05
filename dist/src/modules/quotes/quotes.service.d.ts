import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
export declare class QuotesService {
    private readonly prisma;
    private readonly notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    getQuotesForJob(jobId: string, userId: string): Promise<{
        quotes: any;
    }>;
    acceptQuote(quoteId: string, userId: string): Promise<{
        success: boolean;
    }>;
    declineQuote(quoteId: string, userId: string): Promise<{
        success: boolean;
    }>;
    withdrawQuote(quoteId: string, userId: string): Promise<{
        success: boolean;
    }>;
}
