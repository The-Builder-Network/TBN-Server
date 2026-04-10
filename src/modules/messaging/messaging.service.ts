import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationGateway } from '../notifications/notification.gateway.js';
import { ChatGateway } from './chat.gateway.js';
import type { SendMessageDto } from './dto/send-message.dto.js';
import { handlePrismaError } from '../../common/prisma-error.helper.js';

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationGateway: NotificationGateway,
    private readonly chatGateway: ChatGateway,
  ) {}

  // ── GET /conversations ─────────────────────────────────────────────────────

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ homeownerId: userId }, { tradespersonId: userId }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        job: { select: { id: true, title: true, serviceSlug: true } },
        homeowner: { select: { id: true, name: true, avatarUrl: true } },
        tradesperson: { select: { id: true, name: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            body: true,
            senderId: true,
            readAt: true,
            createdAt: true,
          },
        },
      },
    });

    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        // Count unread messages (sent by the other party, not read)
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            readAt: null,
          },
        });

        const other =
          conv.homeownerId === userId ? conv.tradesperson : conv.homeowner;
        const lastMessage = conv.messages[0] ?? null;

        return {
          id: conv.id,
          job: conv.job,
          otherParty: other,
          unreadCount,
          lastMessage: lastMessage
            ? {
                body: lastMessage.body,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt.toISOString(),
              }
            : null,
          createdAt: conv.createdAt.toISOString(),
        };
      }),
    );

    return { conversations: formatted };
  }

  // ── GET /conversations/:id/messages ────────────────────────────────────────

  async getMessages(
    conversationId: string,
    userId: string,
    page = 1,
    perPage = 50,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    if (
      conversation.homeownerId !== userId &&
      conversation.tradespersonId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const [total, messages] = await Promise.all([
      this.prisma.message.count({ where: { conversationId } }),
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          body: true,
          senderId: true,
          readAt: true,
          createdAt: true,
        },
      }),
    ]);

    // Mark unread messages from the other party as read
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return {
      data: messages.map((m) => ({
        id: m.id,
        body: m.body,
        senderId: m.senderId,
        readAt: m.readAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  // ── POST /conversations/:id/messages ───────────────────────────────────────

  async sendMessage(
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    if (
      conversation.homeownerId !== userId &&
      conversation.tradespersonId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const message = await this.prisma.message
      .create({
        data: {
          conversationId,
          senderId: userId,
          body: dto.body,
        },
        select: {
          id: true,
          body: true,
          senderId: true,
          readAt: true,
          createdAt: true,
        },
      })
      .catch(handlePrismaError);

    // Touch conversation updatedAt for ordering
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Broadcast to all clients in the conversation room
    this.chatGateway.server.to(`conv:${conversationId}`).emit('new_message', {
      id: message.id,
      body: message.body,
      senderId: message.senderId,
      readAt: message.readAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
    });

    // Notify the other party
    const recipientId =
      conversation.homeownerId === userId
        ? conversation.tradespersonId
        : conversation.homeownerId;

    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const senderName = sender?.name ?? 'Someone';

    const notification = await this.notificationsService.createNotification({
      userId: recipientId,
      type: 'NEW_MESSAGE',
      title: `New message from ${senderName}`,
      linkUrl:
        conversation.homeownerId === recipientId
          ? `/homeowner/my-jobs/${conversation.jobId}`
          : `/tradesperson/contacts`,
    });

    this.notificationGateway.sendNotificationToUser(recipientId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
    });

    return {
      id: message.id,
      body: message.body,
      senderId: message.senderId,
      readAt: message.readAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
