import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationGateway } from '../notifications/notification.gateway.js';
import type { SendMessageDto } from './dto/send-message.dto.js';
export declare class MessagingService {
    private readonly prisma;
    private readonly notificationsService;
    private readonly notificationGateway;
    constructor(prisma: PrismaService, notificationsService: NotificationsService, notificationGateway: NotificationGateway);
    getConversations(userId: string): Promise<{
        conversations: {
            id: string;
            job: {
                serviceSlug: string;
                id: string;
                title: string;
            };
            otherParty: {
                name: string;
                id: string;
                avatarUrl: string | null;
            };
            unreadCount: number;
            lastMessage: {
                body: string;
                senderId: string;
                createdAt: string;
            } | null;
            createdAt: string;
        }[];
    }>;
    getMessages(conversationId: string, userId: string, page?: number, perPage?: number): Promise<{
        data: {
            id: string;
            body: string;
            senderId: string;
            readAt: string | null;
            createdAt: string;
        }[];
        meta: {
            total: number;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    sendMessage(conversationId: string, userId: string, dto: SendMessageDto): Promise<{
        id: string;
        body: string;
        senderId: string;
        readAt: string | null;
        createdAt: string;
    }>;
}
