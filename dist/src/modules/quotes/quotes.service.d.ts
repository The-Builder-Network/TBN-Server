import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
export declare class QuotesService {
    private readonly prisma;
    private readonly notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    getQuotesForJob(jobId: string, userId: string): Promise<{
        quotes: {
            id: string;
            message: string;
            amountPence: number | null;
            estimateRange: string | null;
            status: import("@prisma/client").$Enums.QuoteStatus;
            createdAt: string;
            tradesperson: {
                id: string;
                name: string;
                avatarUrl: string | null;
                username: string | undefined;
                companyName: string | null | undefined;
                avgRating: number | undefined;
                reviewCount: number | undefined;
                completedJobs: number | undefined;
            };
        }[];
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
