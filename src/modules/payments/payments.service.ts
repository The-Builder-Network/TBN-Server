import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StripeService, CREDIT_PACKS } from './stripe.service.js';
import type { UpdateAutoTopupDto } from './dto/payments.dto.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  // ── Get balance ───────────────────────────────────────────────────────────

  async getBalance(userId: string) {
    const credit = await this.prisma.leadCredit.findUnique({
      where: { userId },
    });

    return {
      balance: credit?.balance ?? 0,
      autoTopup: credit?.autoTopup ?? false,
      topupAmount: credit?.topupAmount ?? null,
      topupThreshold: credit?.topupThreshold ?? null,
      lastTopupAt: credit?.lastTopupAt ?? null,
    };
  }

  // ── Create Stripe checkout session ────────────────────────────────────────

  async createCheckout(userId: string, creditAmount: number) {
    const pack = CREDIT_PACKS.find((p) => p.credits === creditAmount);
    if (!pack) {
      throw new BadRequestException(`Invalid credit amount: ${creditAmount}`);
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    // Create a PENDING payment record first so we have an ID for metadata
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        type: 'CREDIT_PURCHASE',
        amountPence: pack.amountPence,
        credits: pack.credits,
        status: 'PENDING',
        description: `${pack.label} Pack — ${pack.credits} lead credits`,
      },
    });

    const { checkoutUrl, sessionId } =
      await this.stripeService.createCheckoutSession({
        userId,
        paymentId: payment.id,
        creditAmount,
        frontendUrl,
      });

    // Store the session ID on the payment record
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { stripeSessionId: sessionId },
    });

    return { checkoutUrl, sessionId };
  }

  // ── Handle incoming Stripe webhook ────────────────────────────────────────

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: ReturnType<StripeService['constructEvent']>;
    try {
      event = this.stripeService.constructEvent(payload, signature, webhookSecret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Webhook signature verification failed: ${msg}`);
      throw new BadRequestException(`Webhook error: ${msg}`);
    }

    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutCompleted(event.data.object as {
        id: string;
        metadata?: Record<string, string> | null;
      });
    } else if (event.type === 'charge.refunded') {
      await this.handleChargeRefunded(event.data.object as {
        id: string;
        amount_refunded: number;
        metadata?: Record<string, string> | null;
      });
    }
  }

  private async handleCheckoutCompleted(session: {
    id: string;
    metadata?: Record<string, string> | null;
  }): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
    });

    if (!payment) {
      this.logger.warn(`No payment found for session ${session.id}`);
      return;
    }

    if (payment.status === 'COMPLETED') {
      // Idempotency — already processed
      return;
    }

    const credits = payment.credits ?? 0;

    await this.prisma.$transaction(async (tx) => {
      // Mark payment completed
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED' },
      });

      // Add credits to user balance (upsert in case row doesn't exist yet)
      await tx.leadCredit.upsert({
        where: { userId: payment.userId },
        create: { userId: payment.userId, balance: credits },
        update: {
          balance: { increment: credits },
          lastTopupAt: new Date(),
        },
      });

      // Notify user
      await tx.notification.create({
        data: {
          userId: payment.userId,
          type: 'CREDIT_TOPUP',
          title: `${credits} credits added to your balance`,
          linkUrl: '/tradesperson/profile?tab=balance',
        },
      });
    });

    this.logger.log(
      `Checkout completed: +${credits} credits for user ${payment.userId}`,
    );
  }

  private async handleChargeRefunded(charge: {
    id: string;
    amount_refunded: number;
    metadata?: Record<string, string> | null;
  }): Promise<void> {
    // Find the related payment via stripePaymentIntentId if tracked
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: charge.id },
    });

    if (!payment || !payment.credits) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          userId: payment.userId,
          type: 'REFUND',
          amountPence: charge.amount_refunded,
          credits: -(payment.credits ?? 0),
          status: 'REFUNDED',
          description: `Refund for payment ${payment.id}`,
        },
      });

      await tx.leadCredit.update({
        where: { userId: payment.userId },
        data: { balance: { decrement: payment.credits ?? 0 } },
      });
    });
  }

  // ── Get payment history ───────────────────────────────────────────────────

  async getPaymentHistory(userId: string, page = 1, perPage = 20) {
    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where: { userId } }),
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          type: true,
          amountPence: true,
          credits: true,
          status: true,
          description: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  // ── Update auto-topup settings ────────────────────────────────────────────

  async updateAutoTopup(userId: string, dto: UpdateAutoTopupDto) {
    const updated = await this.prisma.leadCredit.upsert({
      where: { userId },
      create: {
        userId,
        balance: 0,
        autoTopup: dto.enabled,
        topupAmount: dto.topupAmount ?? null,
        topupThreshold: dto.topupThreshold ?? null,
      },
      update: {
        autoTopup: dto.enabled,
        topupAmount: dto.enabled ? (dto.topupAmount ?? null) : null,
        topupThreshold: dto.enabled ? (dto.topupThreshold ?? null) : null,
      },
    });

    return {
      balance: updated.balance,
      autoTopup: updated.autoTopup,
      topupAmount: updated.topupAmount,
      topupThreshold: updated.topupThreshold,
      lastTopupAt: updated.lastTopupAt,
    };
  }

  // ── Auto-topup trigger (called from express-interest flow) ────────────────

  async triggerAutoTopupIfNeeded(userId: string): Promise<void> {
    const credit = await this.prisma.leadCredit.findUnique({
      where: { userId },
    });

    if (
      !credit ||
      !credit.autoTopup ||
      !credit.topupThreshold ||
      !credit.topupAmount
    ) {
      return;
    }

    if (credit.balance >= credit.topupThreshold) {
      return;
    }

    const pack = CREDIT_PACKS.find((p) => p.credits === credit.topupAmount);
    if (!pack) {
      this.logger.warn(
        `Auto-topup: no pack for ${credit.topupAmount} credits (user ${userId})`,
      );
      return;
    }

    // Record an auto-topup payment and add credits
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId,
          type: 'CREDIT_PURCHASE',
          amountPence: pack.amountPence,
          credits: pack.credits,
          status: 'PENDING',
          description: `Auto-topup — ${pack.label} Pack (${pack.credits} credits)`,
        },
      });

      this.logger.log(
        `Auto-topup initiated for user ${userId}: ${pack.credits} credits (payment ${payment.id})`,
      );

      // Note: in production the payment would go through a saved payment method
      // via Stripe's PaymentIntents with setup_future_usage. For now, we log the
      // intent and the manual Stripe call would complete this.
    });
  }

  // ── Lookup a payment by ID (admin / validation) ───────────────────────────

  async getPaymentById(id: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.userId !== userId) throw new NotFoundException('Payment not found');
    return payment;
  }
}
