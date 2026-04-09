import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { QuotesService } from './quotes.service.js';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto.js';

@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  /** GET /jobs/:jobId/quotes — homeowner sees all quotes for their job */
  @Get('jobs/:jobId/quotes')
  @Roles('HOMEOWNER')
  async getQuotesForJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quotesService.getQuotesForJob(jobId, user.sub);
  }

  /** PATCH /quotes/:id — accept, decline, or withdraw */
  @Patch('quotes/:id')
  async updateQuoteStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateQuoteStatusDto,
  ) {
    switch (dto.status) {
      case 'ACCEPTED':
        return this.quotesService.acceptQuote(id, user.sub);
      case 'DECLINED':
        return this.quotesService.declineQuote(id, user.sub);
      case 'WITHDRAWN':
        return this.quotesService.withdrawQuote(id, user.sub);
    }
  }
}
