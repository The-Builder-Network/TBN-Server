import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QuestionsService } from './questions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { GetQuestionsQueryDto } from './dto/get-questions-query.dto.js';
import { CreateAnswerDto } from './dto/create-answer.dto.js';

@Controller('api/v1')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  // ── POST /questions — any authenticated user ──────────────────────────────

  @Post('questions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createQuestion(
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateQuestionDto,
  ) {
    return this.questionsService.createQuestion(user.sub, dto);
  }

  // ── GET /questions — public, paginated, filterable ────────────────────────

  @Get('questions')
  @UseGuards(OptionalJwtAuthGuard)
  async getQuestions(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetQuestionsQueryDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    // Support ?mine=true to filter by current user's questions
    if (query.authorId === 'mine' && user) {
      query.authorId = user.sub;
    } else if (query.authorId === 'mine') {
      query.authorId = undefined;
    }
    return this.questionsService.getQuestions(query);
  }

  // ── GET /questions/:id — public, include likedByMe if authed ─────────────

  @Get('questions/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async getQuestion(@Param('id') id: string, @CurrentUser() user?: JwtPayload) {
    return this.questionsService.getQuestion(id, user?.sub);
  }

  // ── POST /questions/:id/answers — TRADESPERSON only ──────────────────────

  @Post('questions/:id/answers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.CREATED)
  async createAnswer(
    @CurrentUser() user: JwtPayload,
    @Param('id') questionId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateAnswerDto,
  ) {
    return this.questionsService.createAnswer(questionId, user.sub, dto);
  }

  // ── POST /answers/:id/like — toggle like ──────────────────────────────────

  @Post('answers/:id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async toggleLike(
    @CurrentUser() user: JwtPayload,
    @Param('id') answerId: string,
  ) {
    return this.questionsService.toggleAnswerLike(answerId, user.sub);
  }

  // ── PATCH /answers/:id/best — question author only ────────────────────────

  @Patch('answers/:id/best')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markBest(
    @CurrentUser() user: JwtPayload,
    @Param('id') answerId: string,
  ) {
    return this.questionsService.markBestAnswer(answerId, user.sub);
  }

  // ── PATCH /answers/:id — edit answer (TRADESPERSON, author only, no likes) ─

  @Patch('answers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.OK)
  async editAnswer(
    @CurrentUser() user: JwtPayload,
    @Param('id') answerId: string,
    @Body() dto: { body: string },
  ) {
    return this.questionsService.editAnswer(answerId, user.sub, dto.body);
  }

  // ── DELETE /answers/:id — delete answer (TRADESPERSON, author only) ────────

  @Delete('answers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAnswer(
    @CurrentUser() user: JwtPayload,
    @Param('id') answerId: string,
  ) {
    return this.questionsService.deleteAnswer(answerId, user.sub);
  }
}
