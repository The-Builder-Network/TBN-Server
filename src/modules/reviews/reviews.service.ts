import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';
import type { ReplyToReviewDto } from './dto/reply-to-review.dto.js';
import type { GetReviewsQueryDto } from './dto/get-reviews-query.dto.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── POST /reviews — create review with eligibility checks ─────────────────

  async createReview(authorId: string, dto: CreateReviewDto) {
    const { jobId, tradespersonId, rating, comment } = dto;

    // 1. Fetch the job
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    // 2. Job must be COMPLETED
    if (job.status !== 'COMPLETED') {
      throw new BadRequestException('Reviews can only be left on completed jobs');
    }

    // 3. Author must be the job's homeowner
    if (job.homeownerId !== authorId) {
      throw new ForbiddenException('Only the homeowner can leave a review for this job');
    }

    // 4. Subject must be the tradesperson who was HIRED for this job
    const hiredLead = await this.prisma.lead.findFirst({
      where: {
        jobId,
        tradespersonId,
        status: 'HIRED',
      },
    });
    if (!hiredLead) {
      throw new ForbiddenException(
        'You can only review the tradesperson hired for this job',
      );
    }

    // 5. Within 90 days of completion
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const updatedAt = job.updatedAt;
    if (Date.now() - updatedAt.getTime() > ninetyDaysMs) {
      throw new BadRequestException('Review window has expired (90 days after completion)');
    }

    // 6. One review per job (unique constraint)
    const existing = await this.prisma.review.findUnique({
      where: { jobId_authorId: { jobId, authorId } },
    });
    if (existing) {
      throw new ConflictException('You have already left a review for this job');
    }

    // 7. Create review
    const review = await this.prisma.review.create({
      data: {
        jobId,
        authorId,
        subjectId: tradespersonId,
        rating,
        comment,
      },
    });

    // 8. Recalculate avgRating + reviewCount on tradesperson profile (fire-and-forget)
    void this.recalculateRating(tradespersonId);

    return { id: review.id };
  }

  // ── GET /reviews?tradespersonId=X — paginated ─────────────────────────────

  async getReviews(query: GetReviewsQueryDto) {
    const { tradespersonId, page = 1, perPage = 10 } = query;

    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where: { subjectId: tradespersonId } }),
      this.prisma.review.findMany({
        where: { subjectId: tradespersonId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          author: { select: { name: true, avatarUrl: true } },
          job: { select: { title: true } },
          reply: { select: { body: true, createdAt: true } },
        },
      }),
    ]);

    return {
      data: reviews.map((r) => ({
        id: r.id,
        authorName: r.author.name,
        authorAvatar: r.author.avatarUrl,
        rating: r.rating,
        comment: r.comment,
        jobTitle: r.job.title,
        createdAt: r.createdAt,
        reply: r.reply
          ? { body: r.reply.body, createdAt: r.reply.createdAt }
          : undefined,
      })),
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  // ── POST /reviews/:id/reply ───────────────────────────────────────────────

  async replyToReview(reviewId: string, userId: string, dto: ReplyToReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { reply: true },
    });
    if (!review) throw new NotFoundException('Review not found');

    // Only the tradesperson who is the subject can reply
    if (review.subjectId !== userId) {
      throw new ForbiddenException('Only the reviewed tradesperson can reply');
    }

    // One reply per review
    if (review.reply) {
      throw new ConflictException('A reply has already been posted for this review');
    }

    const reply = await this.prisma.reviewReply.create({
      data: {
        reviewId,
        authorId: userId,
        body: dto.body,
      },
    });

    return { id: reply.id, body: reply.body, createdAt: reply.createdAt };
  }

  // ── Recalculate avg rating ─────────────────────────────────────────────────

  private async recalculateRating(tradespersonId: string) {
    const result = await this.prisma.review.aggregate({
      where: { subjectId: tradespersonId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const avgRating = result._avg.rating ?? 0;
    const reviewCount = result._count.rating;

    await this.prisma.tradespersonProfile.update({
      where: { userId: tradespersonId },
      data: {
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount,
      },
    });
  }
}
