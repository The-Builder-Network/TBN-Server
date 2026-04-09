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
} from '@nestjs/common';
import { LeadsService } from './leads.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { GetLeadsQueryDto } from './dto/get-leads-query.dto.js';
import { ExpressInterestDto } from './dto/express-interest.dto.js';

@Controller('api/v1/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // ── PUBLIC: trust-signal lead count ──────────────────────────────────────

  @Get('count')
  async countLeads(
    @Query('postcode') postcode: string,
    @Query('radius') radius: string,
  ) {
    const radiusNum = Math.min(Math.max(parseInt(radius || '30', 10), 1), 200);
    const count = await this.leadsService.countAvailableLeadsNear(
      postcode || '',
      radiusNum,
    );
    return { count };
  }

  // ── TRADESPERSON: list leads ──────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  async getLeads(
    @CurrentUser() user: JwtPayload,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetLeadsQueryDto,
  ) {
    return this.leadsService.getLeads(user.sub, query);
  }

  // ── TRADESPERSON: lead detail ─────────────────────────────────────────────

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  async getLead(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.leadsService.getLead(id, user.sub);
  }

  // ── TRADESPERSON: express interest ───────────────────────────────────────

  @Post(':id/express-interest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.OK)
  async expressInterest(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: ExpressInterestDto,
  ) {
    return this.leadsService.expressInterest(id, user.sub, dto);
  }
}
