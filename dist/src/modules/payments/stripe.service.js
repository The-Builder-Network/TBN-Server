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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var StripeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = exports.CREDIT_PACKS = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
exports.CREDIT_PACKS = [
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
let StripeService = StripeService_1 = class StripeService {
    configService;
    stripeClient = null;
    logger = new common_1.Logger(StripeService_1.name);
    constructor(configService) {
        this.configService = configService;
        const secretKey = this.configService.get('STRIPE_SECRET_KEY');
        if (secretKey) {
            this.stripeClient = new stripe_1.default(secretKey, {
                apiVersion: '2026-03-25.dahlia',
            });
        }
        else {
            this.logger.warn('STRIPE_SECRET_KEY not set — Stripe features disabled');
        }
    }
    async createCheckoutSession(params) {
        if (!this.stripeClient) {
            throw new Error('Stripe is not configured');
        }
        const pack = exports.CREDIT_PACKS.find((p) => p.credits === params.creditAmount);
        if (!pack) {
            throw new Error(`No credit pack found for ${params.creditAmount} credits`);
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
        return { checkoutUrl: session.url, sessionId: session.id };
    }
    constructEvent(payload, signature, secret) {
        if (!this.stripeClient) {
            throw new Error('Stripe is not configured');
        }
        return this.stripeClient.webhooks.constructEvent(payload, signature, secret);
    }
    get isConfigured() {
        return this.stripeClient !== null;
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = StripeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StripeService);
//# sourceMappingURL=stripe.service.js.map