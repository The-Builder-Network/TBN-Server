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
        balance: any;
        autoTopup: any;
        topupAmount: any;
        topupThreshold: any;
        lastTopupAt: any;
    }>;
    createCheckout(userId: string, creditAmount: number): Promise<{
        checkoutUrl: string;
        sessionId: string;
    }>;
    handleWebhook(payload: Buffer, signature: string): Promise<void>;
    private handleCheckoutExpired;
    private handleCheckoutCompleted;
    private handleChargeRefunded;
    getPaymentHistory(userId: string, page?: number, perPage?: number): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    updateAutoTopup(userId: string, dto: UpdateAutoTopupDto): Promise<{
        balance: any;
        autoTopup: any;
        topupAmount: any;
        topupThreshold: any;
        lastTopupAt: any;
    }>;
    triggerAutoTopupIfNeeded(userId: string): Promise<void>;
    getPaymentById(id: string, userId: string): Promise<any>;
}
