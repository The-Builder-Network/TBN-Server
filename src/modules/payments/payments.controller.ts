import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { PaymentsService } from './payments.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { CreateCheckoutDto, PageQueryDto } from './dto/payments.dto.js';

@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('packs')
  packs() {
    return this.payments.getPacks();
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  balance(@CurrentUser() user: JwtPayload) {
    return this.payments.getBalance(user.sub);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  checkout(@CurrentUser() user: JwtPayload, @Body() dto: CreateCheckoutDto) {
    return this.payments.createCheckout(user.sub, dto.creditAmount);
  }

  @Get('sessions/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  confirm(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId') sessionId: string,
  ) {
    return this.payments.confirmSession(user.sub, sessionId);
  }

  /** Stripe → us. Public, signature-verified; raw body is enabled in main.ts. */
  @Post('webhook')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!req.rawBody) throw new BadRequestException('Missing body');
    await this.payments.handleWebhook(req.rawBody, signature);
    return { received: true };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  history(@CurrentUser() user: JwtPayload, @Query() q: PageQueryDto) {
    return this.payments.getPaymentHistory(user.sub, q.page, q.perPage);
  }

  /** Every credit movement: purchases, reserves, releases, lead fees, adjustments. */
  @Get('ledger')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  ledger(@CurrentUser() user: JwtPayload, @Query() q: PageQueryDto) {
    return this.payments.getLedger(user.sub, q.page ?? 1, q.perPage ?? 20);
  }
}
