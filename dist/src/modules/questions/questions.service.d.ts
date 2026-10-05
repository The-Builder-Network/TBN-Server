import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateQuestionDto } from './dto/create-question.dto.js';
import type { GetQuestionsQueryDto } from './dto/get-questions-query.dto.js';
import type { CreateAnswerDto } from './dto/create-answer.dto.js';
export declare class QuestionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createQuestion(authorId: string, dto: CreateQuestionDto): Promise<{
        id: any;
        questionNumber: any;
    }>;
    getQuestions(query: GetQuestionsQueryDto): Promise<{
        data: any;
        meta: {
            page: number;
            perPage: number;
            total: any;
            totalPages: number;
        };
    }>;
    getQuestion(id: string, currentUserId?: string): Promise<{
        id: any;
        questionNumber: any;
        title: any;
        body: any;
        serviceSlug: any;
        authorName: any;
        authorAvatar: any;
        authorId: any;
        createdAt: any;
        answers: any;
    }>;
    createAnswer(questionId: string, authorId: string, dto: CreateAnswerDto): Promise<{
        id: any;
    }>;
    toggleAnswerLike(answerId: string, userId: string): Promise<{
        liked: boolean;
        likesCount: any;
    }>;
    editAnswer(answerId: string, userId: string, body: string): Promise<{
        id: any;
    }>;
    deleteAnswer(answerId: string, userId: string): Promise<void>;
    markBestAnswer(answerId: string, userId: string): Promise<void>;
}
