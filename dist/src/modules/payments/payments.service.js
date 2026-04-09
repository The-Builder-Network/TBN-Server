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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
let PaymentsService = class PaymentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
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
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map