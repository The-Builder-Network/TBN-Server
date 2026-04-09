import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Body,
  Headers,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { CreateCheckoutDto, UpdateAutoTopupDto } from './dto/payments.dto.js';

@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── GET /payments/balance (TRADESPERSON) ─────────────────────────────────

  @Get('balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  async getBalance(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.getBalance(user.sub);
  }

  // ── POST /payments/checkout (TRADESPERSON) ───────────────────────────────

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  async createCheckout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.paymentsService.createCheckout(user.sub, dto.creditAmount);
  }

  // ── POST /payments/webhook (PUBLIC — Stripe calls this) ──────────────────

  @Post('webhook')
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    const payload = req.rawBody;
    if (!payload) {
      return { received: false };
    }
    await this.paymentsService.handleWebhook(payload, signature);
    return { received: true };
  }

  // ── GET /payments/history (TRADESPERSON) ─────────────────────────────────

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  async getHistory(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('perPage') perPage = '20',
  ) {
    return this.paymentsService.getPaymentHistory(
      user.sub,
      parseInt(page, 10),
      parseInt(perPage, 10),
    );
  }

  // ── PATCH /payments/auto-topup (TRADESPERSON) ────────────────────────────

  @Patch('auto-topup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  async updateAutoTopup(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateAutoTopupDto,
  ) {
    return this.paymentsService.updateAutoTopup(user.sub, dto);
  }
}
