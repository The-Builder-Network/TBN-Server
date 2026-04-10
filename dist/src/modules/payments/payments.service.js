"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
const stripe_service_js_1 = require("./stripe.service.js");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    prisma;
    stripeService;
    configService;
    logger = new common_1.Logger(PaymentsService_1.name);
    constructor(prisma, stripeService, configService) {
        this.prisma = prisma;
        this.stripeService = stripeService;
        this.configService = configService;
    }
    async getBalance(userId) {
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
    async createCheckout(userId, creditAmount) {
        const pack = stripe_service_js_1.CREDIT_PACKS.find((p) => p.credits === creditAmount);
        if (!pack) {
            throw new common_1.BadRequestException(`Invalid credit amount: ${creditAmount}`);
        }
        const frontendUrl = this.configService.get('FRONTEND_URL') ?? 'http://localhost:5173';
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
        const { checkoutUrl, sessionId } = await this.stripeService.createCheckoutSession({
            userId,
            paymentId: payment.id,
            creditAmount,
            frontendUrl,
        });
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: { stripeSessionId: sessionId },
        });
        return { checkoutUrl, sessionId };
    }
    async handleWebhook(payload, signature) {
        const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
        if (!webhookSecret) {
            throw new common_1.BadRequestException('Webhook secret not configured');
        }
        let event;
        try {
            event = this.stripeService.constructEvent(payload, signature, webhookSecret);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            this.logger.warn(`Webhook signature verification failed: ${msg}`);
            throw new common_1.BadRequestException(`Webhook error: ${msg}`);
        }
        if (event.type === 'checkout.session.completed') {
            await this.handleCheckoutCompleted(event.data.object);
        }
        else if (event.type === 'checkout.session.expired') {
            await this.handleCheckoutExpired(event.data.object);
        }
        else if (event.type === 'charge.refunded') {
            await this.handleChargeRefunded(event.data.object);
        }
    }
    async handleCheckoutExpired(session) {
        await this.prisma.payment.updateMany({
            where: { stripeSessionId: session.id, status: 'PENDING' },
            data: { status: 'FAILED' },
        });
        this.logger.log(`Checkout session expired: marked FAILED for session ${session.id}`);
    }
    async handleCheckoutCompleted(session) {
        const payment = await this.prisma.payment.findUnique({
            where: { stripeSessionId: session.id },
        });
        if (!payment) {
            this.logger.warn(`No payment found for session ${session.id}`);
            return;
        }
        if (payment.status === 'COMPLETED') {
            return;
        }
        const credits = payment.credits ?? 0;
        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: { status: 'COMPLETED' },
            });
            await tx.leadCredit.upsert({
                where: { userId: payment.userId },
                create: { userId: payment.userId, balance: credits },
                update: {
                    balance: { increment: credits },
                    lastTopupAt: new Date(),
                },
            });
            await tx.notification.create({
                data: {
                    userId: payment.userId,
                    type: 'CREDIT_TOPUP',
                    title: `${credits} credits added to your balance`,
                    linkUrl: '/tradesperson/profile?tab=balance',
                },
            });
        });
        this.logger.log(`Checkout completed: +${credits} credits for user ${payment.userId}`);
    }
    async handleChargeRefunded(charge) {
        const payment = await this.prisma.payment.findFirst({
            where: { stripePaymentIntentId: charge.id },
        });
        if (!payment || !payment.credits)
            return;
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
    async getPaymentHistory(userId, page = 1, perPage = 20) {
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
    async updateAutoTopup(userId, dto) {
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
    async triggerAutoTopupIfNeeded(userId) {
        const credit = await this.prisma.leadCredit.findUnique({
            where: { userId },
        });
        if (!credit ||
            !credit.autoTopup ||
            !credit.topupThreshold ||
            !credit.topupAmount) {
            return;
        }
        if (credit.balance >= credit.topupThreshold) {
            return;
        }
        const pack = stripe_service_js_1.CREDIT_PACKS.find((p) => p.credits === credit.topupAmount);
        if (!pack) {
            this.logger.warn(`Auto-topup: no pack for ${credit.topupAmount} credits (user ${userId})`);
            return;
        }
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
            this.logger.log(`Auto-topup initiated for user ${userId}: ${pack.credits} credits (payment ${payment.id})`);
        });
    }
    async getPaymentById(id, userId) {
        const payment = await this.prisma.payment.findUnique({ where: { id } });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        if (payment.userId !== userId)
            throw new common_1.NotFoundException('Payment not found');
        return payment;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        stripe_service_js_1.StripeService,
        config_1.ConfigService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map