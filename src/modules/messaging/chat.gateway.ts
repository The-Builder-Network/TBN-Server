import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../auth/auth.service.js';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

@WebSocketGateway({
  namespace: '/ws/chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Auth handshake ─────────────────────────────────────────────────────────

  async handleConnection(client: AuthenticatedSocket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const secret = this.config.get<string>('JWT_SECRET')!;
      const payload = this.jwt.verify<JwtPayload>(token, { secret });
      client.user = payload;
      // Join personal notification room
      void client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: AuthenticatedSocket) {
    // cleanup handled by socket.io automatically
  }

  // ── join_conversation ──────────────────────────────────────────────────────

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;

    // Verify the user is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: data.conversationId },
    });

    if (
      !conversation ||
      (conversation.homeownerId !== client.user.sub &&
        conversation.tradespersonId !== client.user.sub)
    ) {
      return;
    }

    void client.join(`conversation:${data.conversationId}`);
  }

  // ── send_message ───────────────────────────────────────────────────────────

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; body: string },
  ) {
    if (!client.user) return;
    if (!data.body || data.body.trim().length === 0) return;
    if (data.body.length > 2000) return;

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: data.conversationId },
    });

    if (
      !conversation ||
      (conversation.homeownerId !== client.user.sub &&
        conversation.tradespersonId !== client.user.sub)
    ) {
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

  // ── typing ─────────────────────────────────────────────────────────────────

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;
    client
      .to(`conversation:${data.conversationId}`)
      .emit('typing', { userId: client.user.sub });
  }
}
