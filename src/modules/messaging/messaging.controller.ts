import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { MessagingService } from './messaging.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';

@Controller('api/v1/conversations')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ── GET /conversations ────────────────────────────────────────────────────

  @Get()
  async getConversations(@CurrentUser() user: JwtPayload) {
    return this.messagingService.getConversations(user.sub);
  }

  // ── GET /conversations/:id/messages ──────────────────────────────────────

  @Get(':id/messages')
  async getMessages(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(50), ParseIntPipe) perPage: number,
  ) {
    return this.messagingService.getMessages(id, user.sub, page, perPage);
  }

  // ── POST /conversations/:id/messages ──────────────────────────────────────

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(id, user.sub, dto);
  }
}
