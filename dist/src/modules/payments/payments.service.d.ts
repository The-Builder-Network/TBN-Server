import { PrismaService } from '../../prisma/prisma.service.js';
export declare class PaymentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getBalance(userId: string): Promise<{
        balance: number;
        autoTopup: boolean;
        topupAmount: number | null;
        topupThreshold: number | null;
        lastTopupAt: Date | null;
    }>;
    getPaymentHistory(userId: string, page?: number, perPage?: number): Promise<{
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
