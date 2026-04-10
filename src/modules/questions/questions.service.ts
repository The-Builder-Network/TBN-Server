import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateQuestionDto } from './dto/create-question.dto.js';
import type { GetQuestionsQueryDto } from './dto/get-questions-query.dto.js';
import type { CreateAnswerDto } from './dto/create-answer.dto.js';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── POST /questions ──────────────────────────────────────────────────────

  async createQuestion(authorId: string, dto: CreateQuestionDto) {
    const question = await this.prisma.question.create({
      data: {
        authorId,
        title: dto.title,
        body: dto.body,
        serviceSlug: dto.serviceSlug,
      },
    });
    return { id: question.id, questionNumber: question.questionNumber };
  }

  // ── GET /questions ───────────────────────────────────────────────────────

  async getQuestions(query: GetQuestionsQueryDto) {
    const {
      serviceSlug,
      authorId,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      perPage = 20,
    } = query;

    const where: Record<string, unknown> = {};
    if (serviceSlug) where.serviceSlug = serviceSlug;
    if (authorId) where.authorId = authorId;

    const [total, questions] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          author: { select: { name: true } },
          answers: {
            select: { isBest: true },
          },
        },
      }),
    ]);

    const data = questions.map((q) => ({
      id: q.id,
      questionNumber: q.questionNumber,
      title: q.title,
      body: q.body,
      serviceSlug: q.serviceSlug ?? undefined,
      authorName: q.author.name,
      answerCount: q.answerCount,
      hasBestAnswer: q.answers.some((a) => a.isBest),
      createdAt: q.createdAt.toISOString(),
    }));

    return {
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  // ── GET /questions/:id ────────────────────────────────────────────────────

  async getQuestion(id: string, currentUserId?: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, avatarUrl: true } },
        answers: {
          orderBy: [
            { isBest: 'desc' },
            { likesCount: 'desc' },
            { createdAt: 'asc' },
          ],
          include: {
            author: {
              select: {
                name: true,
                avatarUrl: true,
                tradespersonProfile: {
                  select: { username: true, trade: true },
                },
              },
            },
            likes: {
              where: currentUserId
                ? { userId: currentUserId }
                : { userId: '__none__' },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!question) throw new NotFoundException('Question not found');

    return {
      id: question.id,
      questionNumber: question.questionNumber,
      title: question.title,
      body: question.body,
      serviceSlug: question.serviceSlug ?? undefined,
      authorName: question.author.name,
      authorAvatar: question.author.avatarUrl ?? undefined,
      authorId: question.authorId,
      createdAt: question.createdAt.toISOString(),
      answers: question.answers.map((a) => ({
        id: a.id,
        authorId: a.authorId,
        authorName: a.author.name,
        authorAvatar: a.author.avatarUrl ?? undefined,
        authorUsername: a.author.tradespersonProfile?.username ?? undefined,
        authorTrade: a.author.tradespersonProfile?.trade ?? undefined,
        body: a.body,
        isBest: a.isBest,
        likesCount: a.likesCount,
        likedByMe: currentUserId ? a.likes.length > 0 : false,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  // ── POST /questions/:id/answers ───────────────────────────────────────────

  async createAnswer(
    questionId: string,
    authorId: string,
    dto: CreateAnswerDto,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Question not found');

    const [answer] = await this.prisma.$transaction([
      this.prisma.answer.create({
        data: {
          questionId,
          authorId,
          body: dto.body,
        },
      }),
      this.prisma.question.update({
        where: { id: questionId },
        data: { answerCount: { increment: 1 } },
      }),
    ]);

    return { id: answer.id };
  }

  // ── POST /answers/:id/like ─────────────────────────────────────────────────

  async toggleAnswerLike(answerId: string, userId: string) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
    });
    if (!answer) throw new NotFoundException('Answer not found');

    // Prevent author from liking their own answer
    if (answer.authorId === userId) {
      throw new ForbiddenException('You cannot like your own answer');
    }

    const existing = await this.prisma.answerLike.findUnique({
      where: { answerId_userId: { answerId, userId } },
    });

    if (existing) {
      // Unlike
      await this.prisma.$transaction([
        this.prisma.answerLike.delete({
          where: { answerId_userId: { answerId, userId } },
        }),
        this.prisma.answer.update({
          where: { id: answerId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      const updated = await this.prisma.answer.findUniqueOrThrow({
        where: { id: answerId },
        select: { likesCount: true },
      });
      return { liked: false, likesCount: updated.likesCount };
    } else {
      // Like
      await this.prisma.$transaction([
        this.prisma.answerLike.create({
          data: { answerId, userId },
        }),
        this.prisma.answer.update({
          where: { id: answerId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
      const updated = await this.prisma.answer.findUniqueOrThrow({
        where: { id: answerId },
        select: { likesCount: true },
      });
      return { liked: true, likesCount: updated.likesCount };
    }
  }

  // ── PATCH /answers/:id — edit (only by author, only if no likes) ───────────

  async editAnswer(answerId: string, userId: string, body: string) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
    });
    if (!answer) throw new NotFoundException('Answer not found');
    if (answer.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own answers');
    }
    if (answer.likesCount > 0) {
      throw new BadRequestException(
        'Cannot edit an answer that has been liked',
      );
    }

    const updated = await this.prisma.answer.update({
      where: { id: answerId },
      data: { body },
    });
    return { id: updated.id };
  }

  // ── DELETE /answers/:id — delete (only by author, any time) ───────────────

  async deleteAnswer(answerId: string, userId: string) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
    });
    if (!answer) throw new NotFoundException('Answer not found');
    if (answer.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own answers');
    }

    await this.prisma.$transaction([
      this.prisma.answer.delete({ where: { id: answerId } }),
      this.prisma.question.update({
        where: { id: answer.questionId },
        data: { answerCount: { decrement: 1 } },
      }),
    ]);
  }

  // ── PATCH /answers/:id/best ────────────────────────────────────────────────

  async markBestAnswer(answerId: string, userId: string) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
      include: { question: { select: { authorId: true } } },
    });
    if (!answer) throw new NotFoundException('Answer not found');
    if (answer.question.authorId !== userId) {
      throw new ForbiddenException(
        'Only the question author can mark the best answer',
      );
    }

    await this.prisma.$transaction([
      // Unset previous best answer on this question
      this.prisma.answer.updateMany({
        where: { questionId: answer.questionId, isBest: true },
        data: { isBest: false },
      }),
      // Set this answer as best
      this.prisma.answer.update({
        where: { id: answerId },
        data: { isBest: true },
      }),
    ]);
  }
}
