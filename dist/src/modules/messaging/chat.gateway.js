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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
let ChatGateway = class ChatGateway {
    jwt;
    config;
    prisma;
    server;
    constructor(jwt, config, prisma) {
        this.jwt = jwt;
        this.config = config;
        this.prisma = prisma;
    }
    async handleConnection(client) {
        const token = client.handshake.auth?.token ??
            client.handshake.query?.token;
        if (!token) {
            client.disconnect();
            return;
        }
        try {
            const secret = this.config.get('JWT_SECRET');
            const payload = this.jwt.verify(token, { secret });
            client.user = payload;
            void client.join(`user:${payload.sub}`);
        }
        catch {
            client.disconnect();
        }
    }
    handleDisconnect(_client) {
    }
    async handleJoinConversation(client, data) {
        if (!client.user)
            return;
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: data.conversationId },
        });
        if (!conversation ||
            (conversation.homeownerId !== client.user.sub &&
                conversation.tradespersonId !== client.user.sub)) {
            return;
        }
        void client.join(`conversation:${data.conversationId}`);
    }
    async handleSendMessage(client, data) {
        if (!client.user)
            return;
        if (!data.body || data.body.trim().length === 0)
            return;
        if (data.body.length > 2000)
            return;
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: data.conversationId },
        });
        if (!conversation ||
            (conversation.homeownerId !== client.user.sub &&
                conversation.tradespersonId !== client.user.sub)) {
            return;
        }
        const message = await this.prisma.message.create({
            data: {
                conversationId: data.conversationId,
                senderId: client.user.sub,
                body: data.body.trim(),
            },
        });
        await this.prisma.conversation.update({
            where: { id: data.conversationId },
            data: { updatedAt: new Date() },
        });
        const payload = {
            id: message.id,
            conversationId: data.conversationId,
            senderId: message.senderId,
            body: message.body,
            readAt: null,
            createdAt: message.createdAt.toISOString(),
        };
        this.server
            .to(`conversation:${data.conversationId}`)
            .emit('new_message', payload);
    }
    async handleTyping(client, data) {
        if (!client.user)
            return;
        client
            .to(`conversation:${data.conversationId}`)
            .emit('typing', { userId: client.user.sub });
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_conversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTyping", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/ws/chat',
        cors: { origin: '*', credentials: true },
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        prisma_service_js_1.PrismaService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map