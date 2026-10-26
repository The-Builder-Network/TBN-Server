import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { allowedOrigins } from '../../common/cors.js';
import { authenticateSocket } from '../../common/socket-auth.js';

@WebSocketGateway({
  namespace: '/ws/notifications',
  cors: { origin: allowedOrigins(), credentials: true },
})
export class NotificationGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const user = authenticateSocket(
      client,
      this.jwt,
      this.config.get<string>('JWT_SECRET')!,
    );
    if (!user) {
      client.disconnect();
      return;
    }
    void client.join(`user:${user.sub}`);
  }

  /** Push a notification to every open tab of a user. */
  sendNotificationToUser(
    userId: string,
    notification: {
      id: string;
      type: string;
      title: string;
      body?: string | null;
      linkUrl?: string | null;
    },
  ) {
    this.server?.to(`user:${userId}`).emit('notification', notification);
  }
}
