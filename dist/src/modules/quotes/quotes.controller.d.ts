import type { JwtPayload } from '../auth/auth.service.js';
import { QuotesService } from './quotes.service.js';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto.js';
export declare class QuotesController {
    private readonly quotesService;
    constructor(quotesService: QuotesService);
    getQuotesForJob(jobId: string, user: JwtPayload): Promise<{
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
    updateQuoteStatus(id: string, user: JwtPayload, dto: UpdateQuoteStatusDto): Promise<{
        success: boolean;
    }>;
}
