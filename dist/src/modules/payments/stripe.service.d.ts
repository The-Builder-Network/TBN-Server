import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
export interface CreditPack {
    credits: number;
    amountPence: number;
    label: string;
    pricePerCredit: string;
}
export declare const CREDIT_PACKS: CreditPack[];
type StripeInstance = ReturnType<typeof Stripe>;
export declare class StripeService {
    private readonly configService;
    private readonly stripeClient;
    private readonly logger;
    constructor(configService: ConfigService);
    createCheckoutSession(params: {
        userId: string;
        paymentId: string;
        creditAmount: number;
        frontendUrl: string;
    }): Promise<{
        checkoutUrl: string;
        sessionId: string;
    }>;
    constructEvent(payload: Buffer, signature: string, secret: string): ReturnType<StripeInstance['webhooks']['constructEvent']>;
    get isConfigured(): boolean;
}
export {};
