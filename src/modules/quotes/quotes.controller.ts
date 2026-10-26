import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
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
  getQuotesForJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quotesService.getQuotesForJob(jobId, user.sub);
  }

  /** PATCH /quotes/:id — homeowner accepts (= hire) / declines; trade withdraws */
  @Patch('quotes/:id')
  updateQuoteStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateQuoteStatusDto,
  ) {
    if (dto.status === 'WITHDRAWN') {
      if (user.role !== 'TRADESPERSON') throw new ForbiddenException();
      return this.quotesService.withdrawQuote(id, user.sub);
    }
    if (user.role !== 'HOMEOWNER') throw new ForbiddenException();
    return dto.status === 'ACCEPTED'
      ? this.quotesService.acceptQuote(id, user.sub)
      : this.quotesService.declineQuote(id, user.sub);
  }
}
