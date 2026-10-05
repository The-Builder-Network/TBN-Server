import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationGateway } from '../notifications/notification.gateway.js';
import { ChatGateway } from './chat.gateway.js';
import type { SendMessageDto } from './dto/send-message.dto.js';
export declare class MessagingService {
    private readonly prisma;
    private readonly notificationsService;
    private readonly notificationGateway;
    private readonly chatGateway;
    constructor(prisma: PrismaService, notificationsService: NotificationsService, notificationGateway: NotificationGateway, chatGateway: ChatGateway);
    getConversations(userId: string): Promise<{
        conversations: any;
    }>;
    getMessages(conversationId: string, userId: string, page?: number, perPage?: number): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    sendMessage(conversationId: string, userId: string, dto: SendMessageDto): Promise<{
        id: any;
        body: any;
        senderId: any;
        readAt: any;
        createdAt: any;
    }>;
}
