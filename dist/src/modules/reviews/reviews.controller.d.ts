import { ReviewsService } from './reviews.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { ReplyToReviewDto } from './dto/reply-to-review.dto.js';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto.js';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    createReview(user: JwtPayload, dto: CreateReviewDto): Promise<{
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
    replyToReview(user: JwtPayload, id: string, dto: ReplyToReviewDto): Promise<{
        id: any;
        body: any;
        createdAt: any;
    }>;
}
