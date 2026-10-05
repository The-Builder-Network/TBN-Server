import type { Request } from 'express';
import { PaymentsService } from './payments.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { CreateCheckoutDto, UpdateAutoTopupDto } from './dto/payments.dto.js';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    getBalance(user: JwtPayload): Promise<{
        balance: any;
        autoTopup: any;
        topupAmount: any;
        topupThreshold: any;
        lastTopupAt: any;
    }>;
    createCheckout(user: JwtPayload, dto: CreateCheckoutDto): Promise<{
        checkoutUrl: string;
        sessionId: string;
    }>;
    handleWebhook(req: Request & {
        rawBody?: Buffer;
    }, signature: string): Promise<{
        received: boolean;
    }>;
    getHistory(user: JwtPayload, page?: string, perPage?: string): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    updateAutoTopup(user: JwtPayload, dto: UpdateAutoTopupDto): Promise<{
        balance: any;
        autoTopup: any;
        topupAmount: any;
        topupThreshold: any;
        lastTopupAt: any;
    }>;
}
