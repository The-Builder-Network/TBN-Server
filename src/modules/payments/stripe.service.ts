import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

// ── Credit pack definitions ─────────────────────────────────────────────────

export interface CreditPack {
  credits: number;
  amountPence: number;
  label: string;
  pricePerCredit: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { credits: 25, amountPence: 2500, label: 'Starter', pricePerCredit: '£1.00' },
  {
    credits: 60,
    amountPence: 5000,
    label: 'Standard',
    pricePerCredit: '£0.83',
  },
  { credits: 150, amountPence: 10000, label: 'Pro', pricePerCredit: '£0.67' },
  {
    credits: 400,
    amountPence: 20000,
    label: 'Enterprise',
    pricePerCredit: '£0.50',
  },
];

type StripeInstance = ReturnType<typeof Stripe>;

@Injectable()
export class StripeService {
  private readonly stripeClient: StripeInstance | null = null;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripeClient = new Stripe(secretKey, {
        apiVersion: '2026-03-25.dahlia',
      });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set — Stripe features disabled');
    }
  }

  // ── Create a Stripe Checkout Session ──────────────────────────────────────

  async createCheckoutSession(params: {
    userId: string;
    paymentId: string;
    creditAmount: number;
    frontendUrl: string;
  }): Promise<{ checkoutUrl: string; sessionId: string }> {
    if (!this.stripeClient) {
      throw new Error('Stripe is not configured');
    }

    const pack = CREDIT_PACKS.find((p) => p.credits === params.creditAmount);
    if (!pack) {
      throw new Error(
        `No credit pack found for ${params.creditAmount} credits`,
      );
    }

    const session = await this.stripeClient.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: pack.amountPence,
            product_data: {
              name: `${pack.label} Pack — ${pack.credits} lead credits`,
              description: `${pack.pricePerCredit}/credit`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: params.userId,
        paymentId: params.paymentId,
        credits: String(pack.credits),
      },
      success_url: `${params.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${params.frontendUrl}/payment/cancel`,
    });

    return { checkoutUrl: session.url!, sessionId: session.id };
  }

  // ── Verify and parse a Stripe webhook event ───────────────────────────────

  constructEvent(
    payload: Buffer,
    signature: string,
    secret: string,
  ): ReturnType<StripeInstance['webhooks']['constructEvent']> {
    if (!this.stripeClient) {
      throw new Error('Stripe is not configured');
    }
    return this.stripeClient.webhooks.constructEvent(
      payload,
      signature,
      secret,
    );
  }

  get isConfigured(): boolean {
    return this.stripeClient !== null;
  }
}
