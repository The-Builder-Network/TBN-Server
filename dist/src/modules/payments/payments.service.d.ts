import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StripeService } from './stripe.service.js';
import type { UpdateAutoTopupDto } from './dto/payments.dto.js';
export declare class PaymentsService {
    private readonly prisma;
    private readonly stripeService;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, stripeService: StripeService, configService: ConfigService);
    getBalance(userId: string): Promise<{
        balance: number;
        autoTopup: boolean;
        topupAmount: number | null;
        topupThreshold: number | null;
        lastTopupAt: Date | null;
    }>;
    createCheckout(userId: string, creditAmount: number): Promise<{
        checkoutUrl: string;
        sessionId: string;
    }>;
    handleWebhook(payload: Buffer, signature: string): Promise<void>;
    private handleCheckoutCompleted;
    private handleChargeRefunded;
    getPaymentHistory(userId: string, page?: number, perPage?: number): Promise<{
        data: {
            type: import("@prisma/client").$Enums.PaymentType;
            id: string;
            createdAt: Date;
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
    updateAutoTopup(userId: string, dto: UpdateAutoTopupDto): Promise<{
        balance: number;
        autoTopup: boolean;
        topupAmount: number | null;
        topupThreshold: number | null;
        lastTopupAt: Date | null;
    }>;
    triggerAutoTopupIfNeeded(userId: string): Promise<void>;
    getPaymentById(id: string, userId: string): Promise<{
        type: import("@prisma/client").$Enums.PaymentType;
        id: string;
        createdAt: Date;
        userId: string;
        description: string | null;
        status: import("@prisma/client").$Enums.PaymentStatus;
        amountPence: number;
        credits: number | null;
        stripeSessionId: string | null;
        stripePaymentIntentId: string | null;
    }>;
}
