import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type {
  CreateReviewDto,
  UpdateReviewDto,
} from './dto/create-review.dto.js';
import type { ReplyToReviewDto } from './dto/reply-to-review.dto.js';
import type { GetReviewsQueryDto } from './dto/get-reviews-query.dto.js';

const REVIEW_WINDOW_DAYS = 365;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Reviews are allowed once the homeowner has hired the trade through the platform. */
  async createReview(authorId: string, dto: CreateReviewDto) {
    const job = await this.prisma.job.findUnique({ where: { id: dto.jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.homeownerId !== authorId) {
      throw new ForbiddenException('Only the homeowner can review this job');
    }
    const hiredLead = await this.prisma.lead.findFirst({
      where: {
        jobId: job.id,
        tradespersonId: dto.tradespersonId,
        status: 'HIRED',
      },
    });
    if (!hiredLead) {
      throw new ForbiddenException(
        'You can only review the tradesperson you hired for this job',
      );
    }
    const since = hiredLead.hiredAt ?? job.updatedAt;
    if (
      Date.now() - since.getTime() >
      REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ) {
      throw new BadRequestException(
        'The review window for this job has closed',
      );
    }
    const existing = await this.prisma.review.findUnique({
      where: { jobId_authorId: { jobId: job.id, authorId } },
    });
    if (existing)
      throw new ConflictException(
        'You have already reviewed this job — you can edit your review instead',
      );

    const review = await this.prisma.$transaction(async (tx) => {
      const r = await tx.review.create({
        data: {
          jobId: job.id,
          authorId,
          subjectId: dto.tradespersonId,
          rating: dto.rating,
          comment: dto.comment,
        },
      });
      await this.recalculateRating(tx, dto.tradespersonId);
      return r;
    });

    void this.notifications.notify({
      userId: dto.tradespersonId,
      type: 'NEW_REVIEW',
      title: `You received a ${dto.rating}-star review for "${job.title}"`,
      linkUrl: '/tradesperson/profile?tab=reviews',
      email: {
        subject: 'You have a new review',
        paragraphs: [
          `A customer left you a ${dto.rating}-star review for "${job.title}".`,
          'You can reply publicly from your profile.',
        ],
        ctaLabel: 'View review',
      },
    });
    return { id: review.id };
  }

  async updateReview(reviewId: string, authorId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.authorId !== authorId)
      throw new ForbiddenException('You can only edit your own review');

    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: {
          rating: dto.rating ?? review.rating,
          comment: dto.comment ?? review.comment,
        },
      });
      await this.recalculateRating(tx, review.subjectId);
    });
    return { id: reviewId };
  }

  async getReviews(query: GetReviewsQueryDto) {
    const { tradespersonId, page = 1, perPage = 10 } = query;
    const where: Prisma.ReviewWhereInput = {
      subjectId: tradespersonId,
      hiddenAt: null,
    };
    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          author: {
            select: { name: true, avatarUrl: true, accountStatus: true },
          },
          job: { select: { title: true, placeName: true } },
          reply: { select: { body: true, createdAt: true } },
        },
      }),
    ]);
    return {
      data: reviews.map((r) => ({
        id: r.id,
        authorName:
          r.author.accountStatus === 'DELETED'
            ? 'Former customer'
            : r.author.name.split(' ')[0],
        authorAvatar:
          r.author.accountStatus === 'DELETED' ? null : r.author.avatarUrl,
        rating: r.rating,
        comment: r.comment,
        jobTitle: r.job.title,
        location: r.job.placeName,
        createdAt: r.createdAt,
        reply: r.reply
          ? { body: r.reply.body, createdAt: r.reply.createdAt }
          : undefined,
      })),
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  async replyToReview(reviewId: string, userId: string, dto: ReplyToReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { reply: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.subjectId !== userId)
      throw new ForbiddenException('Only the reviewed tradesperson can reply');
    if (review.reply)
      throw new ConflictException('You have already replied to this review');

    const reply = await this.prisma.reviewReply.create({
      data: { reviewId, authorId: userId, body: dto.body },
    });
    return { id: reply.id, body: reply.body, createdAt: reply.createdAt };
  }

  /** Average of visible reviews, written in the same transaction as the review change. */
  async recalculateRating(
    tx: Prisma.TransactionClient,
    tradespersonId: string,
  ) {
    const agg = await tx.review.aggregate({
      where: { subjectId: tradespersonId, hiddenAt: null },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await tx.tradespersonProfile.updateMany({
      where: { userId: tradespersonId },
      data: {
        avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count.rating,
      },
    });
  }
}
