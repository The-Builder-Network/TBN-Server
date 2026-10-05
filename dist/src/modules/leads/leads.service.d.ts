import { PrismaService } from '../../prisma/prisma.service.js';
import type { GetLeadsQueryDto } from './dto/get-leads-query.dto.js';
import type { ExpressInterestDto } from './dto/express-interest.dto.js';
import { PaymentsService } from '../payments/payments.service.js';
export declare class LeadsService {
    private readonly prisma;
    private readonly paymentsService;
    constructor(prisma: PrismaService, paymentsService: PaymentsService);
    countAvailableLeadsNear(_postcode: string, _radiusMiles: number): Promise<number>;
    getLeads(tradespersonId: string, query: GetLeadsQueryDto): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    getLead(leadId: string, tradespersonId: string): Promise<any>;
    expressInterest(leadId: string, tradespersonId: string, dto: ExpressInterestDto): Promise<any>;
    getBalance(userId: string): Promise<{
        balance: any;
        autoTopup: any;
        topupAmount: any;
        topupThreshold: any;
        lastTopupAt: any;
    }>;
}
