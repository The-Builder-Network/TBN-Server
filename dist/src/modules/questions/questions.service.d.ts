import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateQuestionDto } from './dto/create-question.dto.js';
import type { GetQuestionsQueryDto } from './dto/get-questions-query.dto.js';
import type { CreateAnswerDto } from './dto/create-answer.dto.js';
export declare class QuestionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createQuestion(authorId: string, dto: CreateQuestionDto): Promise<{
        id: string;
    }>;
    getQuestions(query: GetQuestionsQueryDto): Promise<{
        data: {
            id: string;
            title: string;
            body: string;
            serviceSlug: string | undefined;
            authorName: string;
            answerCount: number;
            hasBestAnswer: boolean;
            createdAt: string;
        }[];
        meta: {
            page: number;
            perPage: number;
            total: number;
            totalPages: number;
        };
    }>;
    getQuestion(id: string, currentUserId?: string): Promise<{
        id: string;
        title: string;
        body: string;
        serviceSlug: string | undefined;
        authorName: string;
        authorAvatar: string | undefined;
        authorId: string;
        createdAt: string;
        answers: {
            id: string;
            authorName: string;
            authorAvatar: string | undefined;
            authorUsername: string | undefined;
            authorTrade: string | undefined;
            body: string;
            isBest: boolean;
            likesCount: number;
            likedByMe: boolean;
            createdAt: string;
        }[];
    }>;
    createAnswer(questionId: string, authorId: string, dto: CreateAnswerDto): Promise<{
        id: string;
    }>;
    toggleAnswerLike(answerId: string, userId: string): Promise<{
        liked: boolean;
        likesCount: number;
    }>;
    markBestAnswer(answerId: string, userId: string): Promise<void>;
}
