import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { CreateReviewDto, UpdateReviewDto } from './dto/create-review.dto.js';
import { ReplyToReviewDto } from './dto/reply-to-review.dto.js';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto.js';

@Controller('api/v1/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOMEOWNER')
  @HttpCode(HttpStatus.CREATED)
  createReview(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(user.sub, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOMEOWNER')
  updateReview(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(id, user.sub, dto);
  }

  @Get()
  getReviews(@Query() query: GetReviewsQueryDto) {
    return this.reviewsService.getReviews(query);
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.CREATED)
  replyToReview(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReplyToReviewDto,
  ) {
    return this.reviewsService.replyToReview(id, user.sub, dto);
  }
}
