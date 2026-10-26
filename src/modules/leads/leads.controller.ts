import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LeadsService } from './leads.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import {
  CreditRequestDto,
  GetLeadsQueryDto,
  LeadsCountQueryDto,
} from './dto/get-leads-query.dto.js';
import { ExpressInterestDto, QuoteDto } from './dto/express-interest.dto.js';

@Controller('api/v1/leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  // ── PUBLIC: jobs near a postcode (trust signal) ──────────────────────────
  @Get('count')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  count(@Query() query: LeadsCountQueryDto) {
    return this.leads.countLeadsNear(query);
  }

  // ── TRADESPERSON ──────────────────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  getLeads(@CurrentUser() user: JwtPayload, @Query() query: GetLeadsQueryDto) {
    return this.leads.getLeads(user.sub, query);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  summary(@CurrentUser() user: JwtPayload) {
    return this.leads.getSummary(user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  getLead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.leads.getLead(id, user.sub);
  }

  @Post(':id/express-interest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.OK)
  expressInterest(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ExpressInterestDto,
  ) {
    return this.leads.expressInterest(id, user.sub, dto);
  }

  @Post(':id/withdraw')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.OK)
  withdraw(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.leads.withdraw(id, user.sub);
  }

  @Post(':id/dismiss')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.OK)
  dismiss(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.leads.dismiss(id, user.sub);
  }

  @Put(':id/quote')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  quote(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: QuoteDto,
  ) {
    return this.leads.upsertQuote(id, user.sub, dto);
  }

  @Post(':id/request-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.OK)
  requestReview(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.leads.requestReview(id, user.sub);
  }

  @Post(':id/credit-request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.CREATED)
  creditRequest(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreditRequestDto,
  ) {
    return this.leads.requestCredit(id, user.sub, dto.reason, dto.details);
  }
}
