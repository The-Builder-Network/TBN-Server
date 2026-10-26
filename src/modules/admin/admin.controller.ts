import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import {
  AdminNoteDto,
  AdminPageQueryDto,
  CreditAdjustmentDto,
  LeadFeeDto,
  OptionalNoteDto,
} from './dto/admin.dto.js';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.getStats();
  }

  // ── Verification ──
  @Get('verifications')
  verifications(@Query() q: AdminPageQueryDto) {
    return this.admin.listVerifications(q);
  }

  @Get('tradespeople/:userId')
  tradesperson(@Param('userId') userId: string) {
    return this.admin.getTradesperson(userId);
  }

  @Post('tradespeople/:userId/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @CurrentUser() u: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: OptionalNoteDto,
  ) {
    return this.admin.approve(u.sub, userId, dto.note);
  }

  @Post('tradespeople/:userId/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUser() u: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: AdminNoteDto,
  ) {
    return this.admin.reject(u.sub, userId, dto.note);
  }

  @Post('tradespeople/:userId/request-info')
  @HttpCode(HttpStatus.OK)
  requestInfo(
    @CurrentUser() u: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: AdminNoteDto,
  ) {
    return this.admin.requestInfo(u.sub, userId, dto.note);
  }

  // ── Accounts ──
  @Get('users')
  users(@Query() q: AdminPageQueryDto) {
    return this.admin.listUsers(q);
  }

  @Post('users/:userId/suspend')
  @HttpCode(HttpStatus.OK)
  suspend(
    @CurrentUser() u: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: AdminNoteDto,
  ) {
    return this.admin.suspend(u.sub, userId, dto.note);
  }

  @Post('users/:userId/reinstate')
  @HttpCode(HttpStatus.OK)
  reinstate(@CurrentUser() u: JwtPayload, @Param('userId') userId: string) {
    return this.admin.reinstate(u.sub, userId);
  }

  // ── Credits ──
  @Get('users/:userId/credits')
  ledger(@Param('userId') userId: string, @Query() q: AdminPageQueryDto) {
    return this.admin.getCreditLedger(userId, q);
  }

  @Post('users/:userId/credits')
  @HttpCode(HttpStatus.OK)
  adjust(
    @CurrentUser() u: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: CreditAdjustmentDto,
  ) {
    return this.admin.adjustCredits(u.sub, userId, dto.amount, dto.note);
  }

  @Get('credit-requests')
  creditRequests(@Query() q: AdminPageQueryDto) {
    return this.admin.listCreditRequests(q);
  }

  @Post('credit-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveCredit(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body() dto: OptionalNoteDto,
  ) {
    return this.admin.resolveCreditRequest(u.sub, id, true, dto.note);
  }

  @Post('credit-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectCredit(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AdminNoteDto,
  ) {
    return this.admin.resolveCreditRequest(u.sub, id, false, dto.note);
  }

  // ── Services ──
  @Get('services')
  services() {
    return this.admin.listServices();
  }

  @Patch('services/:slug')
  leadFee(
    @CurrentUser() u: JwtPayload,
    @Param('slug') slug: string,
    @Body() dto: LeadFeeDto,
  ) {
    return this.admin.updateLeadFee(u.sub, slug, dto.leadFeeCredits);
  }

  // ── Content ──
  @Get('jobs')
  jobs(@Query() q: AdminPageQueryDto) {
    return this.admin.listJobs(q);
  }

  @Get('reviews')
  reviews(@Query() q: AdminPageQueryDto) {
    return this.admin.listReviews(q);
  }

  @Post('reviews/:id/hide')
  @HttpCode(HttpStatus.OK)
  hideReview(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AdminNoteDto,
  ) {
    return this.admin.setReviewHidden(u.sub, id, true, dto.note);
  }

  @Post('reviews/:id/unhide')
  @HttpCode(HttpStatus.OK)
  unhideReview(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.admin.setReviewHidden(u.sub, id, false);
  }

  @Get('audit-log')
  auditLog(@Query() q: AdminPageQueryDto) {
    return this.admin.listAuditLog(q);
  }
}
