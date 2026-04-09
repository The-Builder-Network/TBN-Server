import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service.js';
import { MessagingController } from './messaging.controller.js';
import { ChatGateway } from './chat.gateway.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  controllers: [MessagingController],
  providers: [MessagingService, ChatGateway],
  exports: [MessagingService],
})
export class MessagingModule {}
