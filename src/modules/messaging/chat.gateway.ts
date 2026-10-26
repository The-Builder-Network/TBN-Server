import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { allowedOrigins } from '../../common/cors.js';
import { authenticateSocket } from '../../common/socket-auth.js';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

const room = (conversationId: string) => `conversation:${conversationId}`;

/**
 * Realtime chat delivery. Messages are *sent* over REST (which persists,
 * notifies and then broadcasts here); sockets only receive events and relay
 * typing indicators between conversation members.
 */
@WebSocketGateway({
  namespace: '/ws/chat',
  cors: { origin: allowedOrigins(), credentials: true },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: AuthenticatedSocket) {
    const user = authenticateSocket(
      client,
      this.jwt,
      this.config.get<string>('JWT_SECRET')!,
    );
    if (!user) {
      client.disconnect();
      return;
    }
    client.user = user;
    void client.join(`user:${user.sub}`);
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId?: string },
  ) {
    if (!client.user || typeof data?.conversationId !== 'string')
      return { ok: false };
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: data.conversationId },
      select: { homeownerId: true, tradespersonId: true },
    });
    if (
      !conversation ||
      (conversation.homeownerId !== client.user.sub &&
        conversation.tradespersonId !== client.user.sub)
    ) {
      return { ok: false };
    }
    await client.join(room(data.conversationId));
    return { ok: true };
  }

  @SubscribeMessage('leave_conversation')
  async handleLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId?: string },
  ) {
    if (typeof data?.conversationId === 'string')
      await client.leave(room(data.conversationId));
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId?: string },
  ) {
    if (!client.user || typeof data?.conversationId !== 'string') return;
    const r = room(data.conversationId);
    if (!client.rooms.has(r)) return; // only members who joined may signal typing
    client.to(r).emit('typing', {
      conversationId: data.conversationId,
      userId: client.user.sub,
    });
  }

  emitMessage(conversationId: string, message: Record<string, unknown>) {
    this.server?.to(room(conversationId)).emit('new_message', message);
  }

  emitRead(conversationId: string, readerId: string) {
    this.server
      ?.to(room(conversationId))
      .emit('messages_read', { conversationId, readerId });
  }
}
