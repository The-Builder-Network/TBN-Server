import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';

@Controller('api/v1/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TRADESPERSON')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('balance')
  async getBalance(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.getBalance(user.sub);
  }

  @Get('history')
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
}
