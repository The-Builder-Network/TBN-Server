import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { ReplyToReviewDto } from './dto/reply-to-review.dto.js';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto.js';

@Controller('api/v1/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ── POST /reviews — create review (HOMEOWNER) ─────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOMEOWNER')
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.sub, dto);
  }

  // ── GET /reviews?tradespersonId=X — paginated ─────────────────────────────

  @Get()
  async getReviews(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetReviewsQueryDto,
  ) {
    return this.reviewsService.getReviews(query);
  }

  // ── POST /reviews/:id/reply (TRADESPERSON only) ───────────────────────────

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.CREATED)
  async replyToReview(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: ReplyToReviewDto,
  ) {
    return this.reviewsService.replyToReview(id, user.sub, dto);
  }
}
