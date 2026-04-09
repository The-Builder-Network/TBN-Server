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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
let NotificationsService = class NotificationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createNotification(data) {
        return this.prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                body: data.body ?? null,
                linkUrl: data.linkUrl ?? null,
                read: false,
            },
        });
    }
    async getNotifications(userId, query) {
        const { page = 1, perPage = 20, unreadOnly = false } = query;
        const where = {
            userId,
            ...(unreadOnly ? { read: false } : {}),
        };
        const [total, notifications] = await Promise.all([
            this.prisma.notification.count({ where }),
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * perPage,
                take: perPage,
            }),
        ]);
        return {
            data: notifications.map((n) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body ?? undefined,
                linkUrl: n.linkUrl ?? undefined,
                read: n.read,
                createdAt: n.createdAt.toISOString(),
            })),
            meta: {
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            },
        };
    }
    async getUnreadCount(userId) {
        const count = await this.prisma.notification.count({
            where: { userId, read: false },
        });
        return { count };
    }
    async markRead(notificationId, userId) {
        await this.prisma.notification.updateMany({
            where: { id: notificationId, userId },
            data: { read: true },
        });
    }
    async markAllRead(userId) {
        await this.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map