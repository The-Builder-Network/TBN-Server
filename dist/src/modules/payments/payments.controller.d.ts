import type { Request } from 'express';
import { PaymentsService } from './payments.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { CreateCheckoutDto, UpdateAutoTopupDto } from './dto/payments.dto.js';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    getBalance(user: JwtPayload): Promise<{
        balance: number;
        autoTopup: boolean;
        topupAmount: number | null;
        topupThreshold: number | null;
        lastTopupAt: Date | null;
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
        data: {
            id: string;
            createdAt: Date;
            type: import("@prisma/client").$Enums.PaymentType;
            description: string | null;
            status: import("@prisma/client").$Enums.PaymentStatus;
            amountPence: number;
            credits: number | null;
        }[];
        meta: {
            total: number;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    updateAutoTopup(user: JwtPayload, dto: UpdateAutoTopupDto): Promise<{
        balance: number;
        autoTopup: boolean;
        topupAmount: number | null;
        topupThreshold: number | null;
        lastTopupAt: Date | null;
    }>;
}
