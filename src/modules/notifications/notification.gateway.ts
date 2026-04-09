import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '../auth/auth.service.js';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

@WebSocketGateway({
  namespace: '/ws/notifications',
  cors: { origin: '*', credentials: true },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

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
      void client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: AuthenticatedSocket) {
    // cleanup handled by socket.io automatically
  }

  /**
   * Emit a real-time notification to a connected user.
   * Called by NotificationsService after persisting the notification.
   */
  sendNotificationToUser(
    userId: string,
    notification: {
      id: string;
      type: string;
      title: string;
      body?: string;
      linkUrl?: string;
    },
  ) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}
