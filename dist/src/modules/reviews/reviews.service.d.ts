import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';
import type { ReplyToReviewDto } from './dto/reply-to-review.dto.js';
import type { GetReviewsQueryDto } from './dto/get-reviews-query.dto.js';
export declare class ReviewsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createReview(authorId: string, dto: CreateReviewDto): Promise<{
        id: any;
    }>;
    getReviews(query: GetReviewsQueryDto): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    replyToReview(reviewId: string, userId: string, dto: ReplyToReviewDto): Promise<{
        id: any;
        body: any;
        createdAt: any;
    }>;
    private recalculateRating;
}
