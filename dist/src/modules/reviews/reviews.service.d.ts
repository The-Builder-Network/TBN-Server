import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';
import type { ReplyToReviewDto } from './dto/reply-to-review.dto.js';
import type { GetReviewsQueryDto } from './dto/get-reviews-query.dto.js';
export declare class ReviewsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createReview(authorId: string, dto: CreateReviewDto): Promise<{
        id: string;
    }>;
    getReviews(query: GetReviewsQueryDto): Promise<{
        data: {
            id: string;
            authorName: string;
            authorAvatar: string | null;
            rating: number;
            comment: string;
            jobTitle: string;
            createdAt: Date;
            reply: {
                body: string;
                createdAt: Date;
            } | undefined;
        }[];
        meta: {
            total: number;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    replyToReview(reviewId: string, userId: string, dto: ReplyToReviewDto): Promise<{
        id: string;
        body: string;
        createdAt: Date;
    }>;
    private recalculateRating;
}
