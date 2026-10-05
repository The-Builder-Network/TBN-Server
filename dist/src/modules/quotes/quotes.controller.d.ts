import type { JwtPayload } from '../auth/auth.service.js';
import { QuotesService } from './quotes.service.js';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto.js';
export declare class QuotesController {
    private readonly quotesService;
    constructor(quotesService: QuotesService);
    getQuotesForJob(jobId: string, user: JwtPayload): Promise<{
        quotes: any;
    }>;
    updateQuoteStatus(id: string, user: JwtPayload, dto: UpdateQuoteStatusDto): Promise<{
        success: boolean;
    }>;
}
