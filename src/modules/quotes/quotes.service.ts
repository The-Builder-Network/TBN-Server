import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** List all quotes for a job (homeowner only) */
  async getQuotesForJob(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { homeownerId: true },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.homeownerId !== userId) throw new ForbiddenException();

    const quotes = await this.prisma.quote.findMany({
      where: { jobId },
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

  /** Homeowner accepts a quote — triggers cascade */
  async acceptQuote(quoteId: string, userId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        job: { select: { homeownerId: true, id: true, title: true } },
      },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.job.homeownerId !== userId) throw new ForbiddenException();
    if (quote.status !== 'PENDING')
      throw new BadRequestException('Quote is no longer pending');

    await this.prisma.$transaction(async (tx) => {
      // Accept this quote
      await tx.quote.update({
        where: { id: quoteId },
        data: { status: 'ACCEPTED' },
      });

      // Decline all other quotes for the same job
      await tx.quote.updateMany({
        where: { jobId: quote.jobId, id: { not: quoteId }, status: 'PENDING' },
        data: { status: 'DECLINED' },
      });

      // Update the lead to HIRED
      await tx.lead.updateMany({
        where: { jobId: quote.jobId, tradespersonId: quote.tradespersonId },
        data: { status: 'HIRED' },
      });

      // Reject all other leads
      await tx.lead.updateMany({
        where: {
          jobId: quote.jobId,
          tradespersonId: { not: quote.tradespersonId },
          status: { in: ['INTERESTED', 'SHORTLISTED', 'CONTACTED'] },
        },
        data: { status: 'REJECTED' },
      });

      // Move job to IN_PROGRESS
      await tx.job.update({
        where: { id: quote.jobId },
        data: { status: 'IN_PROGRESS' },
      });
    });

    // Notify hired tradesperson
    await this.notifications.createNotification({
      userId: quote.tradespersonId,
      type: 'NEW_QUOTE',
      title: `Your quote was accepted for "${quote.job.title}"`,
      linkUrl: `/tradesperson/my-leads/${quote.jobId}`,
    });

    return { success: true };
  }

  /** Homeowner declines a quote */
  async declineQuote(quoteId: string, userId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { job: { select: { homeownerId: true, title: true } } },
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

  /** Tradesperson withdraws their own quote */
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
