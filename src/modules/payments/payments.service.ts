import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
