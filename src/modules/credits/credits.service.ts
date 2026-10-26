import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { CreditTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

type Tx = Prisma.TransactionClient;

export const WELCOME_CREDITS = Number(process.env.WELCOME_CREDITS ?? 20);

interface LedgerRefs {
  leadId?: string;
  paymentId?: string;
  creditRequestId?: string;
  adminId?: string;
  note?: string;
}

export class InsufficientCreditsException extends HttpException {
  constructor(required: number, balance: number) {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'INSUFFICIENT_CREDITS',
        message: `You need ${required} credits but only have ${balance}. Please top up.`,
        required,
        balance,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

/**
 * The only place credit balances change. Every change is a conditional,
 * atomic UPDATE (so concurrent requests can't overdraw) plus an append-only
 * CreditTransaction row. All methods take the caller's transaction client so
 * balance changes commit or roll back together with the lead/payment change.
 *
 *  - balance:  spendable credits
 *  - reserved: credits held against open expressions of interest
 */
@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccount(userId: string) {
    const acc = await this.prisma.leadCredit.findUnique({ where: { userId } });
    return {
      balance: acc?.balance ?? 0,
      reserved: acc?.reserved ?? 0,
      autoTopup: acc?.autoTopup ?? false,
      topupAmount: acc?.topupAmount ?? null,
      topupThreshold: acc?.topupThreshold ?? null,
      lastTopupAt: acc?.lastTopupAt ?? null,
    };
  }

  async getHistory(userId: string, page = 1, perPage = 20) {
    const where = { userId };
    const [total, rows] = await Promise.all([
      this.prisma.creditTransaction.count({ where }),
      this.prisma.creditTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        reservedChange: r.reservedChange,
        balanceAfter: r.balanceAfter,
        reservedAfter: r.reservedAfter,
        leadId: r.leadId,
        note: r.note,
        createdAt: r.createdAt,
      })),
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  /** Credit the spendable balance (welcome bonus, purchase, admin credit). */
  grant(
    tx: Tx,
    userId: string,
    amount: number,
    type: CreditTransactionType,
    refs: LedgerRefs = {},
  ) {
    return this.apply(tx, userId, amount, 0, type, refs);
  }

  /**
   * Debit the spendable balance (admin debit, purchase reversal after a refund).
   * `allowNegative` is only for reversals of credits the user already spent.
   */
  debit(
    tx: Tx,
    userId: string,
    amount: number,
    type: CreditTransactionType,
    refs: LedgerRefs = {},
    allowNegative = false,
  ) {
    return this.apply(tx, userId, -amount, 0, type, refs, allowNegative);
  }

  /** Hold credits for an expression of interest. Throws 402 if not enough. */
  reserve(tx: Tx, userId: string, leadId: string, amount: number) {
    return this.apply(tx, userId, -amount, amount, 'RESERVE', { leadId });
  }

  /** Return held credits (declined / withdrawn / not selected / expired). */
  release(
    tx: Tx,
    userId: string,
    leadId: string,
    amount: number,
    note?: string,
  ) {
    if (amount <= 0) return Promise.resolve(null);
    return this.apply(tx, userId, amount, -amount, 'RELEASE', { leadId, note });
  }

  /** Convert held credits into the lead fee (homeowner shortlisted the trade). */
  charge(tx: Tx, userId: string, leadId: string, amount: number) {
    return this.apply(tx, userId, 0, -amount, 'LEAD_FEE', { leadId });
  }

  private async apply(
    tx: Tx,
    userId: string,
    balanceDelta: number,
    reservedDelta: number,
    type: CreditTransactionType,
    refs: LedgerRefs,
    allowNegative = false,
  ) {
    await tx.leadCredit.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    // Conditional atomic update: never let either balance go below zero.
    const guard: Prisma.LeadCreditWhereInput = { userId };
    if (balanceDelta < 0 && !allowNegative)
      guard.balance = { gte: -balanceDelta };
    if (reservedDelta < 0) guard.reserved = { gte: -reservedDelta };

    const { count } = await tx.leadCredit.updateMany({
      where: guard,
      data: {
        balance: { increment: balanceDelta },
        reserved: { increment: reservedDelta },
        ...(type === 'PURCHASE' ? { lastTopupAt: new Date() } : {}),
      },
    });

    const after = await tx.leadCredit.findUniqueOrThrow({ where: { userId } });
    if (count === 0) {
      if (balanceDelta < 0)
        throw new InsufficientCreditsException(-balanceDelta, after.balance);
      throw new HttpException(
        'Credit balance is out of sync',
        HttpStatus.CONFLICT,
      );
    }

    return tx.creditTransaction.create({
      data: {
        userId,
        type,
        amount: balanceDelta,
        reservedChange: reservedDelta,
        balanceAfter: after.balance,
        reservedAfter: after.reserved,
        ...refs,
      },
    });
  }
}
