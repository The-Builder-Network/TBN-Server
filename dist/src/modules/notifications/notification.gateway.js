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
exports.NotificationGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let NotificationGateway = class NotificationGateway {
    jwt;
    config;
    server;
    constructor(jwt, config) {
        this.jwt = jwt;
        this.config = config;
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
    sendNotificationToUser(userId, notification) {
        this.server.to(`user:${userId}`).emit('notification', notification);
    }
};
exports.NotificationGateway = NotificationGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationGateway.prototype, "server", void 0);
exports.NotificationGateway = NotificationGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/ws/notifications',
        cors: { origin: '*', credentials: true },
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], NotificationGateway);
//# sourceMappingURL=notification.gateway.js.map