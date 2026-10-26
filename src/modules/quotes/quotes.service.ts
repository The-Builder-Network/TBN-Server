import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { HiringService } from '../jobs/hiring.service.js';
import { JobsService } from '../jobs/jobs.service.js';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hiring: HiringService,
    private readonly jobs: JobsService,
  ) {}

  /** All quotes for a job (homeowner only). */
  async getQuotesForJob(idOrNumber: string, userId: string) {
    const job = await this.jobs.getOwnedJob(idOrNumber, userId);
    const quotes = await this.prisma.quote.findMany({
      where: { jobId: job.id },
      orderBy: { createdAt: 'desc' },
      include: {
        tradesperson: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            tradespersonProfile: {
              select: {
                username: true,
                companyName: true,
                avgRating: true,
                reviewCount: true,
                completedJobs: true,
              },
            },
          },
        },
      },
    });
    return {
      quotes: quotes.map((q) => ({
        id: q.id,
        message: q.message,
        amountPence: q.amountPence,
        estimateRange: q.estimateRange,
        status: q.status,
        createdAt: q.createdAt.toISOString(),
        tradesperson: {
          id: q.tradesperson.id,
          name: q.tradesperson.name,
          avatarUrl: q.tradesperson.avatarUrl,
          username: q.tradesperson.tradespersonProfile?.username,
          companyName: q.tradesperson.tradespersonProfile?.companyName,
          avgRating: q.tradesperson.tradespersonProfile?.avgRating,
          reviewCount: q.tradesperson.tradespersonProfile?.reviewCount,
          completedJobs: q.tradesperson.tradespersonProfile?.completedJobs,
        },
      })),
    };
  }

  /** Accepting a quote hires the trade who sent it. */
  acceptQuote(quoteId: string, userId: string) {
    return this.hiring.acceptQuote(quoteId, userId);
  }

  async declineQuote(quoteId: string, userId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { job: { select: { homeownerId: true } } },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.job.homeownerId !== userId) throw new ForbiddenException();
    if (quote.status !== 'PENDING')
      throw new BadRequestException('Quote is no longer pending');
    await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'DECLINED' },
    });
    return { success: true };
  }

  async withdrawQuote(quoteId: string, userId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.tradespersonId !== userId) throw new ForbiddenException();
    if (quote.status !== 'PENDING')
      throw new BadRequestException('Quote is no longer pending');
    await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'WITHDRAWN' },
    });
    return { success: true };
  }
}
