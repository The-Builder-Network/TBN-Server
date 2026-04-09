"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
let QuestionsService = class QuestionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createQuestion(authorId, dto) {
        const question = await this.prisma.question.create({
            data: {
                authorId,
                title: dto.title,
                body: dto.body,
                serviceSlug: dto.serviceSlug,
            },
        });
        return { id: question.id };
    }
    async getQuestions(query) {
        const { serviceSlug, sort = 'createdAt', order = 'desc', page = 1, perPage = 20, } = query;
        const where = serviceSlug ? { serviceSlug } : {};
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
    async getQuestion(id, currentUserId) {
        const question = await this.prisma.question.findUnique({
            where: { id },
            include: {
                author: { select: { name: true, avatarUrl: true } },
                answers: {
                    orderBy: [{ isBest: 'desc' }, { likesCount: 'desc' }, { createdAt: 'asc' }],
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
                            where: currentUserId ? { userId: currentUserId } : { userId: '__none__' },
                            select: { id: true },
                        },
                    },
                },
            },
        });
        if (!question)
            throw new common_1.NotFoundException('Question not found');
        return {
            id: question.id,
            title: question.title,
            body: question.body,
            serviceSlug: question.serviceSlug ?? undefined,
            authorName: question.author.name,
            authorAvatar: question.author.avatarUrl ?? undefined,
            authorId: question.authorId,
            createdAt: question.createdAt.toISOString(),
            answers: question.answers.map((a) => ({
                id: a.id,
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
    async createAnswer(questionId, authorId, dto) {
        const question = await this.prisma.question.findUnique({
            where: { id: questionId },
        });
        if (!question)
            throw new common_1.NotFoundException('Question not found');
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
    async toggleAnswerLike(answerId, userId) {
        const answer = await this.prisma.answer.findUnique({
            where: { id: answerId },
        });
        if (!answer)
            throw new common_1.NotFoundException('Answer not found');
        const existing = await this.prisma.answerLike.findUnique({
            where: { answerId_userId: { answerId, userId } },
        });
        if (existing) {
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
        }
        else {
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
    async markBestAnswer(answerId, userId) {
        const answer = await this.prisma.answer.findUnique({
            where: { id: answerId },
            include: { question: { select: { authorId: true } } },
        });
        if (!answer)
            throw new common_1.NotFoundException('Answer not found');
        if (answer.question.authorId !== userId) {
            throw new common_1.ForbiddenException('Only the question author can mark the best answer');
        }
        await this.prisma.$transaction([
            this.prisma.answer.updateMany({
                where: { questionId: answer.questionId, isBest: true },
                data: { isBest: false },
            }),
            this.prisma.answer.update({
                where: { id: answerId },
                data: { isBest: true },
            }),
        ]);
    }
};
exports.QuestionsService = QuestionsService;
exports.QuestionsService = QuestionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], QuestionsService);
//# sourceMappingURL=questions.service.js.map