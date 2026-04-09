import { MessagingService } from './messaging.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
export declare class MessagingController {
    private readonly messagingService;
    constructor(messagingService: MessagingService);
    getConversations(user: JwtPayload): Promise<{
        conversations: {
            id: string;
            job: {
                id: string;
                title: string;
                serviceSlug: string;
            };
            otherParty: {
                id: string;
                name: string;
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
    getMessages(user: JwtPayload, id: string, page: number, perPage: number): Promise<{
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
    sendMessage(user: JwtPayload, id: string, dto: SendMessageDto): Promise<{
        id: string;
        body: string;
        senderId: string;
        readAt: string | null;
        createdAt: string;
    }>;
}
