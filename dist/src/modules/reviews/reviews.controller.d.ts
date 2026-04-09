import { ReviewsService } from './reviews.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { ReplyToReviewDto } from './dto/reply-to-review.dto.js';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto.js';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    createReview(user: JwtPayload, dto: CreateReviewDto): Promise<{
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
    replyToReview(user: JwtPayload, id: string, dto: ReplyToReviewDto): Promise<{
        id: string;
        body: string;
        createdAt: Date;
    }>;
}
