import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface CreditPack {
  credits: number;
  amountPence: number;
  label: string;
  pricePerCredit: string;
  popular?: boolean;
}

/** Single source of truth for credit packs (served to the web via GET /payments/packs). Prices include VAT. */
export const CREDIT_PACKS: CreditPack[] = [
  { credits: 25, amountPence: 2500, label: 'Starter', pricePerCredit: '£1.00' },
  {
    credits: 60,
    amountPence: 5000,
    label: 'Standard',
    pricePerCredit: '£0.83',
    popular: true,
  },
  { credits: 150, amountPence: 10000, label: 'Pro', pricePerCredit: '£0.67' },
  {
    credits: 400,
    amountPence: 20000,
    label: 'Enterprise',
    pricePerCredit: '£0.50',
  },
];

type StripeClient = InstanceType<typeof Stripe>;
export type StripeEvent = ReturnType<
  StripeClient['webhooks']['constructEvent']
>;
export type CheckoutSession = Awaited<
  ReturnType<StripeClient['checkout']['sessions']['retrieve']>
>;

@Injectable()
export class StripeService {
  private readonly client: StripeClient | null = null;
  private readonly logger = new Logger(StripeService.name);

  constructor(config: ConfigService) {
    const secretKey = config.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.client = new Stripe(secretKey, {
        apiVersion: '2026-03-25.dahlia',
        maxNetworkRetries: 2,
      });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set — payments are disabled');
    }
  }

  private get stripe(): StripeClient {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Payments are temporarily unavailable. Please try again later.',
      );
    }
    return this.client;
  }

  /** Reuse one Stripe Customer per user so receipts and payment history are grouped. */
  async ensureCustomer(params: {
    existingId: string | null;
    email: string;
    name: string;
    userId: string;
  }) {
    if (params.existingId) return params.existingId;
    const customer = await this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: { userId: params.userId },
    });
    return customer.id;
  }

  async createCheckoutSession(params: {
    customerId: string;
    userId: string;
    paymentId: string;
    pack: CreditPack;
    frontendUrl: string;
  }): Promise<{ checkoutUrl: string; sessionId: string }> {
    const { pack } = params;
    const metadata = {
      userId: params.userId,
      paymentId: params.paymentId,
      credits: String(pack.credits),
    };
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer: params.customerId,
        client_reference_id: params.paymentId,
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              unit_amount: pack.amountPence,
              product_data: {
                name: `${pack.label} pack — ${pack.credits} lead credits`,
                description: `${pack.pricePerCredit} per credit`,
              },
            },
            quantity: 1,
          },
        ],
        metadata,
        // Always charge in GBP; refunds reverse credits pro rata on the GBP amount.
        adaptive_pricing: { enabled: false },
        payment_intent_data: {
          metadata,
          description: `${pack.credits} lead credits`,
        },
        success_url: `${params.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${params.frontendUrl}/payment/cancel`,
      },
      { idempotencyKey: `checkout-${params.paymentId}` },
    );
    return { checkoutUrl: session.url!, sessionId: session.id };
  }

  retrieveSession(sessionId: string): Promise<CheckoutSession> {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }

  constructEvent(
    payload: Buffer,
    signature: string,
    secret: string,
  ): StripeEvent {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }
}
