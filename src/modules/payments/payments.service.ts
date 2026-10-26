import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  StripeService,
  CREDIT_PACKS,
  type CheckoutSession,
} from './stripe.service.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
    private readonly credits: CreditsService,
    private readonly notifications: NotificationsService,
  ) {}

  getPacks() {
    return { packs: CREDIT_PACKS };
  }

  getBalance(userId: string) {
    return this.credits.getAccount(userId);
  }

  getLedger(userId: string, page: number, perPage: number) {
    return this.credits.getHistory(userId, page, perPage);
  }

  // ── Checkout ──────────────────────────────────────────────────────────────

  async createCheckout(userId: string, creditAmount: number) {
    const pack = CREDIT_PACKS.find((p) => p.credits === creditAmount);
    if (!pack)
      throw new BadRequestException(`Invalid credit amount: ${creditAmount}`);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, name: true, stripeCustomerId: true },
    });
    const customerId = await this.stripe.ensureCustomer({
      existingId: user.stripeCustomerId,
      email: user.email,
      name: user.name,
      userId,
    });
    if (customerId !== user.stripeCustomerId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        type: 'CREDIT_PURCHASE',
        amountPence: pack.amountPence,
        credits: pack.credits,
        status: 'PENDING',
        description: `${pack.label} pack — ${pack.credits} lead credits`,
      },
    });

    const frontendUrl = (
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:8080'
    ).replace(/\/$/, '');
    try {
      const { checkoutUrl, sessionId } =
        await this.stripe.createCheckoutSession({
          customerId,
          userId,
          paymentId: payment.id,
          pack,
          frontendUrl,
        });
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { stripeSessionId: sessionId },
      });
      return { checkoutUrl, sessionId };
    } catch (err) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      throw err;
    }
  }

  /**
   * Called by the success page. Confirms with Stripe directly so credits
   * appear even if the webhook is slow or missed; fulfilment is idempotent.
   */
  async confirmSession(userId: string, sessionId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { stripeSessionId: sessionId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.userId !== userId) throw new ForbiddenException();

    if (payment.status === 'PENDING') {
      const session = await this.stripe.retrieveSession(sessionId);
      if (session.payment_status === 'paid') {
        await this.fulfil(session);
      }
    }
    const [fresh, account] = await Promise.all([
      this.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
      this.credits.getAccount(userId),
    ]);
    return {
      status: fresh.status,
      credits: fresh.credits,
      amountPence: fresh.amountPence,
      balance: account.balance,
    };
  }

  // ── Webhook ───────────────────────────────────────────────────────────────

  async handleWebhook(payload: Buffer, signature: string | undefined) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new BadRequestException('Webhook secret not configured');
    if (!signature) throw new BadRequestException('Missing Stripe signature');

    let event: ReturnType<StripeService['constructEvent']>;
    try {
      event = this.stripe.constructEvent(payload, signature, secret);
    } catch (err) {
      this.logger.warn(
        `Webhook signature verification failed: ${(err as Error).message}`,
      );
      throw new BadRequestException('Invalid signature');
    }

    // Idempotency: each Stripe event is processed at most once.
    try {
      await this.prisma.stripeEvent.create({
        data: { id: event.id, type: event.type },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      )
        return;
      throw err;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded': {
          const session = event.data.object as CheckoutSession;
          if (session.payment_status === 'paid') await this.fulfil(session);
          break;
        }
        case 'checkout.session.async_payment_failed':
        case 'checkout.session.expired': {
          const session = event.data.object as { id: string };
          await this.prisma.payment.updateMany({
            where: { stripeSessionId: session.id, status: 'PENDING' },
            data: { status: 'FAILED' },
          });
          break;
        }
        case 'charge.refunded': {
          const charge = event.data.object as {
            payment_intent: string | { id: string } | null;
            amount: number;
            amount_refunded: number;
          };
          await this.handleRefund(charge);
          break;
        }
        default:
          break;
      }
    } catch (err) {
      // Let Stripe retry: forget the event so the retry is processed.
      await this.prisma.stripeEvent
        .delete({ where: { id: event.id } })
        .catch(() => undefined);
      throw err;
    }
  }

  /** Mark a paid Checkout Session's payment COMPLETED and grant its credits (exactly once). */
  private async fulfil(session: CheckoutSession) {
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);

    const granted = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { stripeSessionId: session.id },
      });
      if (!payment) {
        this.logger.warn(`No payment for Checkout Session ${session.id}`);
        return null;
      }
      // Guarded transition: only one caller can move PENDING → COMPLETED.
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: ['PENDING', 'FAILED'] } },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          stripePaymentIntentId: paymentIntentId,
        },
      });
      if (count === 0) return null;
      await this.credits.grant(
        tx,
        payment.userId,
        payment.credits ?? 0,
        'PURCHASE',
        {
          paymentId: payment.id,
          note: payment.description ?? undefined,
        },
      );
      return payment;
    });

    if (granted) {
      this.logger.log(
        `Payment ${granted.id}: +${granted.credits} credits for ${granted.userId}`,
      );
      void this.notifications.notify({
        userId: granted.userId,
        type: 'CREDIT_TOPUP',
        title: `${granted.credits} credits added to your balance`,
        linkUrl: '/tradesperson/profile?tab=balance',
      });
    }
  }

  /** Reverse credits proportional to the refunded amount (handles repeated partial refunds). */
  private async handleRefund(charge: {
    payment_intent: string | { id: string } | null;
    amount: number;
    amount_refunded: number;
  }) {
    const piId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!piId) return;
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: piId },
    });
    if (!payment || !payment.credits) return;

    await this.prisma.$transaction(async (tx) => {
      const alreadyReversed = await tx.creditTransaction.aggregate({
        where: { paymentId: payment.id, type: 'PURCHASE_REVERSAL' },
        _sum: { amount: true },
      });
      const reversedSoFar = -(alreadyReversed._sum.amount ?? 0);
      const shouldReverse = Math.floor(
        (payment.credits! * charge.amount_refunded) / charge.amount,
      );
      const delta = shouldReverse - reversedSoFar;
      if (delta > 0) {
        await this.credits.debit(
          tx,
          payment.userId,
          delta,
          'PURCHASE_REVERSAL',
          { paymentId: payment.id, note: 'Card payment refunded' },
          true,
        );
      }
      if (charge.amount_refunded >= charge.amount) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED', refundedAt: new Date() },
        });
      }
    });
  }

  // ── History ───────────────────────────────────────────────────────────────

  async getPaymentHistory(userId: string, page = 1, perPage = 20) {
    const where = { userId, status: { not: 'PENDING' as const } };
    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
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
          completedAt: true,
        },
      }),
    ]);
    return {
      data: payments,
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }
}
