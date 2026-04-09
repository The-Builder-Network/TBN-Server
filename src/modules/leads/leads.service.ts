import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { GetLeadsQueryDto } from './dto/get-leads-query.dto.js';
import type { ExpressInterestDto } from './dto/express-interest.dto.js';
import { LeadStatus } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service.js';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ── Count public (trust signal) ───────────────────────────────────────────

  /**
   * Count ACTIVE jobs (proxy for available leads) near a postcode.
   */
  async countAvailableLeadsNear(
    _postcode: string,
    _radiusMiles: number,
  ): Promise<number> {
    const count = await this.prisma.job.count({
      where: { status: 'ACTIVE' },
    });
    return count;
  }

  // ── Get leads list (paginated, filtered) ──────────────────────────────────

  async getLeads(tradespersonId: string, query: GetLeadsQueryDto) {
    const {
      status,
      serviceSlug,
      maxDistanceMiles,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      perPage = 20,
    } = query;

    const where: Prisma.LeadWhereInput = {
      tradespersonId,
    };

    if (status) {
      where.status = status;
    }

    if (serviceSlug) {
      where.job = { serviceSlug };
    }

    if (maxDistanceMiles !== undefined && maxDistanceMiles > 0) {
      where.distanceMiles = { lte: maxDistanceMiles };
    }

    const allowedSorts = ['createdAt', 'distanceMiles', 'creditCost'];
    const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';

    const [total, leads] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        orderBy: { [sortField]: order },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          status: true,
          creditCost: true,
          distanceMiles: true,
          createdAt: true,
          expiresAt: true,
          job: {
            select: {
              id: true,
              title: true,
              serviceSlug: true,
              tradeSlug: true,
              postcode: true,
              placeName: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    return {
      data: leads,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  // ── Get single lead detail ────────────────────────────────────────────────

  async getLead(leadId: string, tradespersonId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        job: {
          include: {
            attachments: true,
          },
        },
      },
    });

    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.tradespersonId !== tradespersonId)
      throw new ForbiddenException('Access denied');

    return lead;
  }

  // ── Express interest (credit deduction) ──────────────────────────────────

  async expressInterest(
    leadId: string,
    tradespersonId: string,
    dto: ExpressInterestDto,
  ) {
    // 1. Verify lead exists and belongs to this tradesperson
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { job: { select: { id: true, homeownerId: true } } },
    });

    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.tradespersonId !== tradespersonId)
      throw new ForbiddenException('Access denied');
    if (lead.status !== LeadStatus.AVAILABLE)
      throw new BadRequestException(
        `Lead is not available (current status: ${lead.status})`,
      );

    const creditCost = lead.creditCost;

    // 2. Atomic transaction: deduct credits, update lead, create quote + conversation
    const result = await this.prisma.$transaction(async (tx) => {
      // Check balance
      const credit = await tx.leadCredit.findUnique({
        where: { userId: tradespersonId },
      });

      const balance = credit?.balance ?? 0;
      if (balance < creditCost) {
        throw new HttpException(
          {
            error: 'INSUFFICIENT_CREDITS',
            required: creditCost,
            balance,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      // Deduct credits
      const updated = await tx.leadCredit.update({
        where: { userId: tradespersonId },
        data: { balance: { decrement: creditCost } },
      });

      // Update lead status
      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: LeadStatus.INTERESTED,
          interestedAt: new Date(),
        },
      });

      // Create quote
      const quote = await tx.quote.create({
        data: {
          jobId: lead.job.id,
          tradespersonId,
          message: dto.message,
          amountPence: dto.quoteAmountPence ?? null,
          status: 'PENDING',
        },
      });

      // Create conversation (upsert to avoid duplicate)
      const conversation = await tx.conversation.upsert({
        where: {
          jobId_homeownerId_tradespersonId: {
            jobId: lead.job.id,
            homeownerId: lead.job.homeownerId,
            tradespersonId,
          },
        },
        create: {
          jobId: lead.job.id,
          homeownerId: lead.job.homeownerId,
          tradespersonId,
          messages: {
            create: {
              senderId: tradespersonId,
              body: dto.message,
            },
          },
        },
        update: {},
      });

      // Notify homeowner
      await tx.notification.create({
        data: {
          userId: lead.job.homeownerId,
          type: 'NEW_INTEREST',
          title: 'A tradesperson is interested in your job',
          linkUrl: `/homeowner/my-jobs/${lead.job.id}`,
        },
      });

      if (dto.quoteAmountPence) {
        await tx.notification.create({
          data: {
            userId: lead.job.homeownerId,
            type: 'NEW_QUOTE',
            title: 'New quote received',
            linkUrl: `/homeowner/my-jobs/${lead.job.id}`,
          },
        });
      }

      return {
        leadStatus: LeadStatus.INTERESTED,
        creditsDeducted: creditCost,
        newBalance: updated.balance,
        quoteId: quote.id,
        conversationId: conversation.id,
      };
    });

    // Trigger auto-topup asynchronously if balance dropped below threshold
    this.paymentsService.triggerAutoTopupIfNeeded(tradespersonId).catch(() => {
      // Non-critical — log but don't fail the request
    });

    return result;
  }

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
}
