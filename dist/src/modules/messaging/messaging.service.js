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
exports.MessagingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
const notifications_service_js_1 = require("../notifications/notifications.service.js");
const notification_gateway_js_1 = require("../notifications/notification.gateway.js");
let MessagingService = class MessagingService {
    prisma;
    notificationsService;
    notificationGateway;
    constructor(prisma, notificationsService, notificationGateway) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.notificationGateway = notificationGateway;
    }
    async getConversations(userId) {
        const conversations = await this.prisma.conversation.findMany({
            where: {
                OR: [{ homeownerId: userId }, { tradespersonId: userId }],
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                job: { select: { id: true, title: true, serviceSlug: true } },
                homeowner: { select: { id: true, name: true, avatarUrl: true } },
                tradesperson: { select: { id: true, name: true, avatarUrl: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        body: true,
                        senderId: true,
                        readAt: true,
                        createdAt: true,
                    },
                },
            },
        });
        const formatted = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await this.prisma.message.count({
                where: {
                    conversationId: conv.id,
                    senderId: { not: userId },
                    readAt: null,
                },
            });
            const other = conv.homeownerId === userId ? conv.tradesperson : conv.homeowner;
            const lastMessage = conv.messages[0] ?? null;
            return {
                id: conv.id,
                job: conv.job,
                otherParty: other,
                unreadCount,
                lastMessage: lastMessage
                    ? {
                        body: lastMessage.body,
                        senderId: lastMessage.senderId,
                        createdAt: lastMessage.createdAt.toISOString(),
                    }
                    : null,
                createdAt: conv.createdAt.toISOString(),
            };
        }));
        return { conversations: formatted };
    }
    async getMessages(conversationId, userId, page = 1, perPage = 50) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation)
            throw new common_1.NotFoundException('Conversation not found');
        if (conversation.homeownerId !== userId &&
            conversation.tradespersonId !== userId) {
            throw new common_1.ForbiddenException('Access denied');
        }
        const [total, messages] = await Promise.all([
            this.prisma.message.count({ where: { conversationId } }),
            this.prisma.message.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'asc' },
                skip: (page - 1) * perPage,
                take: perPage,
                select: {
                    id: true,
                    body: true,
                    senderId: true,
                    readAt: true,
                    createdAt: true,
                },
            }),
        ]);
        await this.prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                readAt: null,
            },
            data: { readAt: new Date() },
        });
        return {
            data: messages.map((m) => ({
                id: m.id,
                body: m.body,
                senderId: m.senderId,
                readAt: m.readAt?.toISOString() ?? null,
                createdAt: m.createdAt.toISOString(),
            })),
            meta: {
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            },
        };
    }
    async sendMessage(conversationId, userId, dto) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation)
            throw new common_1.NotFoundException('Conversation not found');
        if (conversation.homeownerId !== userId &&
            conversation.tradespersonId !== userId) {
            throw new common_1.ForbiddenException('Access denied');
        }
        const message = await this.prisma.message.create({
            data: {
                conversationId,
                senderId: userId,
                body: dto.body,
            },
            select: {
                id: true,
                body: true,
                senderId: true,
                readAt: true,
                createdAt: true,
            },
        });
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });
        const recipientId = conversation.homeownerId === userId
            ? conversation.tradespersonId
            : conversation.homeownerId;
        const sender = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });
        const senderName = sender?.name ?? 'Someone';
        const notification = await this.notificationsService.createNotification({
            userId: recipientId,
            type: 'NEW_MESSAGE',
            title: `New message from ${senderName}`,
            linkUrl: conversation.homeownerId === recipientId
                ? `/homeowner/my-jobs/${conversation.jobId}`
                : `/tradesperson/contacts`,
        });
        this.notificationGateway.sendNotificationToUser(recipientId, {
            id: notification.id,
            type: notification.type,
            title: notification.title,
        });
        return {
            id: message.id,
            body: message.body,
            senderId: message.senderId,
            readAt: message.readAt?.toISOString() ?? null,
            createdAt: message.createdAt.toISOString(),
        };
    }
};
exports.MessagingService = MessagingService;
exports.MessagingService = MessagingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        notifications_service_js_1.NotificationsService,
        notification_gateway_js_1.NotificationGateway])
], MessagingService);
//# sourceMappingURL=messaging.service.js.map