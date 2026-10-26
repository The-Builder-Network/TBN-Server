import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ChatGateway } from './chat.gateway.js';
import type { SendMessageDto } from './dto/send-message.dto.js';

const otherPartySelect = {
  id: true,
  name: true,
  avatarUrl: true,
  accountStatus: true,
  tradespersonProfile: { select: { username: true, companyName: true } },
} as const;

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  private async getParticipantConversation(
    conversationId: string,
    userId: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        job: { select: { id: true, title: true, status: true } },
        homeowner: { select: otherPartySelect },
        tradesperson: { select: otherPartySelect },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (
      conversation.homeownerId !== userId &&
      conversation.tradespersonId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }
    return conversation;
  }

  private summarise(
    conv: Awaited<ReturnType<MessagingService['getParticipantConversation']>>,
    userId: string,
    extra: {
      unreadCount: number;
      lastMessage: { body: string; senderId: string; createdAt: Date } | null;
      leadId?: string | null;
    },
  ) {
    const other =
      conv.homeownerId === userId ? conv.homeowner : conv.tradesperson;
    const deleted = other.accountStatus === 'DELETED';
    return {
      id: conv.id,
      job: conv.job,
      leadId: extra.leadId ?? null,
      otherParty: {
        id: other.id,
        name: deleted ? 'Former member' : other.name,
        avatarUrl: deleted ? null : other.avatarUrl,
        companyName: other.tradespersonProfile?.companyName ?? undefined,
        username: other.tradespersonProfile?.username ?? undefined,
      },
      unreadCount: extra.unreadCount,
      lastMessage: extra.lastMessage
        ? {
            body: extra.lastMessage.body,
            senderId: extra.lastMessage.senderId,
            createdAt: extra.lastMessage.createdAt.toISOString(),
          }
        : null,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    };
  }

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ homeownerId: userId }, { tradespersonId: userId }] },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        job: { select: { id: true, title: true, status: true } },
        homeowner: { select: otherPartySelect },
        tradesperson: { select: otherPartySelect },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, senderId: true, createdAt: true },
        },
      },
    });
    const ids = conversations.map((c) => c.id);
    const [unread, leads] = await Promise.all([
      this.prisma.message.groupBy({
        by: ['conversationId'],
        where: {
          conversationId: { in: ids },
          senderId: { not: userId },
          readAt: null,
        },
        _count: { _all: true },
      }),
      this.prisma.lead.findMany({
        where: { jobId: { in: conversations.map((c) => c.jobId) } },
        select: { id: true, jobId: true, tradespersonId: true },
      }),
    ]);
    const unreadBy = new Map(
      unread.map((u) => [u.conversationId, u._count._all]),
    );
    return {
      conversations: conversations.map((c) =>
        this.summarise(c, userId, {
          unreadCount: unreadBy.get(c.id) ?? 0,
          lastMessage: c.messages[0] ?? null,
          leadId: leads.find(
            (l) => l.jobId === c.jobId && l.tradespersonId === c.tradespersonId,
          )?.id,
        }),
      ),
    };
  }

  async getConversation(conversationId: string, userId: string) {
    const conv = await this.getParticipantConversation(conversationId, userId);
    const [unreadCount, last, lead] = await Promise.all([
      this.prisma.message.count({
        where: { conversationId, senderId: { not: userId }, readAt: null },
      }),
      this.prisma.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        select: { body: true, senderId: true, createdAt: true },
      }),
      this.prisma.lead.findUnique({
        where: {
          jobId_tradespersonId: {
            jobId: conv.jobId,
            tradespersonId: conv.tradespersonId,
          },
        },
        select: { id: true },
      }),
    ]);
    return this.summarise(conv, userId, {
      unreadCount,
      lastMessage: last,
      leadId: lead?.id,
    });
  }

  /**
   * Newest-first paging: returns up to `limit` messages older than `before`
   * (or the latest ones), in chronological order, plus `hasMore`.
   */
  async getMessages(
    conversationId: string,
    userId: string,
    before?: string,
    limit = 50,
  ) {
    await this.getParticipantConversation(conversationId, userId);
    let beforeDate: Date | undefined;
    if (before) {
      beforeDate = new Date(before);
      if (Number.isNaN(beforeDate.getTime()))
        throw new BadRequestException('Invalid cursor');
    }
    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      select: {
        id: true,
        body: true,
        senderId: true,
        readAt: true,
        createdAt: true,
      },
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse();

    if (!beforeDate) await this.markRead(conversationId, userId);

    return {
      data: page.map((m) => ({
        id: m.id,
        body: m.body,
        senderId: m.senderId,
        readAt: m.readAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
      hasMore,
      nextBefore:
        hasMore && page.length ? page[0].createdAt.toISOString() : null,
    };
  }

  async markRead(conversationId: string, userId: string) {
    const { count } = await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
    if (count > 0) this.chatGateway.emitRead(conversationId, userId);
    return { read: count };
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ) {
    const conversation = await this.getParticipantConversation(
      conversationId,
      userId,
    );
    const recipient =
      conversation.homeownerId === userId
        ? conversation.tradesperson
        : conversation.homeowner;
    if (recipient.accountStatus !== 'ACTIVE') {
      throw new BadRequestException('This member is no longer available');
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderId: userId, body: dto.body.trim() },
        select: {
          id: true,
          body: true,
          senderId: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    const payload = {
      id: message.id,
      conversationId,
      body: message.body,
      senderId: message.senderId,
      readAt: null,
      createdAt: message.createdAt.toISOString(),
    };
    this.chatGateway.emitMessage(conversationId, payload);

    // One unread "new message" notification per conversation, not one per message.
    const isHomeownerRecipient = conversation.homeownerId === recipient.id;
    const linkUrl = isHomeownerRecipient
      ? `/homeowner/contacts?conversationId=${conversationId}`
      : `/tradesperson/contacts?conversationId=${conversationId}`;
    const pending = await this.prisma.notification.findFirst({
      where: {
        userId: recipient.id,
        type: 'NEW_MESSAGE',
        linkUrl,
        read: false,
      },
      select: { id: true },
    });
    if (!pending) {
      const sender =
        conversation.homeownerId === userId
          ? conversation.homeowner
          : conversation.tradesperson;
      const senderName = sender.tradespersonProfile?.companyName || sender.name;
      void this.notifications.notify({
        userId: recipient.id,
        type: 'NEW_MESSAGE',
        title: `New message from ${senderName}`,
        body: `About "${conversation.job.title}"`,
        linkUrl,
        email: {
          subject: `New message from ${senderName}`,
          paragraphs: [
            `${senderName} sent you a message about "${conversation.job.title}".`,
          ],
          ctaLabel: 'Read message',
        },
      });
    }
    return payload;
  }
}
