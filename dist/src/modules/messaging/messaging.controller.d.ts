import { MessagingService } from './messaging.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
export declare class MessagingController {
    private readonly messagingService;
    constructor(messagingService: MessagingService);
    getConversations(user: JwtPayload): Promise<{
        conversations: any;
    }>;
    getMessages(user: JwtPayload, id: string, page: number, perPage: number): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    sendMessage(user: JwtPayload, id: string, dto: SendMessageDto): Promise<{
        id: any;
        body: any;
        senderId: any;
        readAt: any;
        createdAt: any;
    }>;
}
