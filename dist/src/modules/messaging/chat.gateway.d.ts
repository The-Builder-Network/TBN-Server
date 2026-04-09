import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
interface AuthenticatedSocket extends Socket {
    user?: JwtPayload;
}
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwt;
    private readonly config;
    private readonly prisma;
    server: Server;
    constructor(jwt: JwtService, config: ConfigService, prisma: PrismaService);
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(_client: AuthenticatedSocket): void;
    handleJoinConversation(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): Promise<void>;
    handleSendMessage(client: AuthenticatedSocket, data: {
        conversationId: string;
        body: string;
    }): Promise<void>;
    handleTyping(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): Promise<void>;
}
export {};
