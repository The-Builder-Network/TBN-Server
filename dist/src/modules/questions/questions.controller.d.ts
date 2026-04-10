import { QuestionsService } from './questions.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { GetQuestionsQueryDto } from './dto/get-questions-query.dto.js';
import { CreateAnswerDto } from './dto/create-answer.dto.js';
export declare class QuestionsController {
    private readonly questionsService;
    constructor(questionsService: QuestionsService);
    createQuestion(user: JwtPayload, dto: CreateQuestionDto): Promise<{
        id: string;
        questionNumber: number;
    }>;
    getQuestions(query: GetQuestionsQueryDto, user?: JwtPayload): Promise<{
        data: {
            id: string;
            questionNumber: number;
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
    getQuestion(id: string, user?: JwtPayload): Promise<{
        id: string;
        questionNumber: number;
        title: string;
        body: string;
        serviceSlug: string | undefined;
        authorName: string;
        authorAvatar: string | undefined;
        authorId: string;
        createdAt: string;
        answers: {
            id: string;
            authorId: string;
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
    createAnswer(user: JwtPayload, questionId: string, dto: CreateAnswerDto): Promise<{
        id: string;
    }>;
    toggleLike(user: JwtPayload, answerId: string): Promise<{
        liked: boolean;
        likesCount: number;
    }>;
    markBest(user: JwtPayload, answerId: string): Promise<void>;
    editAnswer(user: JwtPayload, answerId: string, dto: {
        body: string;
    }): Promise<{
        id: string;
    }>;
    deleteAnswer(user: JwtPayload, answerId: string): Promise<void>;
}
