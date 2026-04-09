import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto.js';

@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── GET /notifications/unread-count — must be before :id route ────────────

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  // ── GET /notifications ────────────────────────────────────────────────────

  @Get()
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetNotificationsQueryDto,
  ) {
    return this.notificationsService.getNotifications(user.sub, query);
  }

  // ── PATCH /notifications/:id/read ─────────────────────────────────────────

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    await this.notificationsService.markRead(id, user.sub);
    return { ok: true };
  }

  // ── POST /notifications/read-all ──────────────────────────────────────────

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.markAllRead(user.sub);
    return { ok: true };
  }
}
