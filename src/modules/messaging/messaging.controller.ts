import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
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

  @Get()
  getConversations(@CurrentUser() user: JwtPayload) {
    return this.messagingService.getConversations(user.sub);
  }

  @Get(':id')
  getConversation(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.messagingService.getConversation(id, user.sub);
  }

  @Get(':id/messages')
  getMessages(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('before') before?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.messagingService.getMessages(
      id,
      user.sub,
      before,
      Math.min(Math.max(limit, 1), 100),
    );
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(id, user.sub, dto);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.messagingService.markRead(id, user.sub);
  }
}
