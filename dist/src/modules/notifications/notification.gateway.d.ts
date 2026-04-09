import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '../auth/auth.service.js';
interface AuthenticatedSocket extends Socket {
    user?: JwtPayload;
}
export declare class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwt;
    private readonly config;
    server: Server;
    constructor(jwt: JwtService, config: ConfigService);
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(_client: AuthenticatedSocket): void;
    sendNotificationToUser(userId: string, notification: {
        id: string;
        type: string;
        title: string;
        body?: string;
        linkUrl?: string;
    }): void;
}
export {};
