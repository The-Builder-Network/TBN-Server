import { QuestionsService } from './questions.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { GetQuestionsQueryDto } from './dto/get-questions-query.dto.js';
import { CreateAnswerDto } from './dto/create-answer.dto.js';
export declare class QuestionsController {
    private readonly questionsService;
    constructor(questionsService: QuestionsService);
    createQuestion(user: JwtPayload, dto: CreateQuestionDto): Promise<{
        id: any;
        questionNumber: any;
    }>;
    getQuestions(query: GetQuestionsQueryDto, user?: JwtPayload): Promise<{
        data: any;
        meta: {
            page: number;
            perPage: number;
            total: any;
            totalPages: number;
        };
    }>;
    getQuestion(id: string, user?: JwtPayload): Promise<{
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
    createAnswer(user: JwtPayload, questionId: string, dto: CreateAnswerDto): Promise<{
        id: any;
    }>;
    toggleLike(user: JwtPayload, answerId: string): Promise<{
        liked: boolean;
        likesCount: any;
    }>;
    markBest(user: JwtPayload, answerId: string): Promise<void>;
    editAnswer(user: JwtPayload, answerId: string, dto: {
        body: string;
    }): Promise<{
        id: any;
    }>;
    deleteAnswer(user: JwtPayload, answerId: string): Promise<void>;
}
