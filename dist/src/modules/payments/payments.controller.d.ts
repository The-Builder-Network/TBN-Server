import { PaymentsService } from './payments.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
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
    getHistory(user: JwtPayload, page?: string, perPage?: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            type: import("@prisma/client").$Enums.PaymentType;
            amountPence: number;
            credits: number | null;
            status: import("@prisma/client").$Enums.PaymentStatus;
            description: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
}
