import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { HealthController } from './health/health.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { LeadsModule } from './modules/leads/leads.module.js';
import { QuotesModule } from './modules/quotes/quotes.module.js';
import { MessagingModule } from './modules/messaging/messaging.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { QuestionsModule } from './modules/questions/questions.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        DATABASE_URL: Joi.string().required(),
        DIRECT_URL: Joi.string().allow('').optional(),
        JWT_SECRET: Joi.string().required(),
        FRONTEND_URL: Joi.string().uri().required(),
        ADMIN_URL: Joi.string().uri().allow('').optional(),
        CORS_ORIGINS: Joi.string().allow('').optional(),
        EMAIL_FROM: Joi.string().allow('').optional(),
        WELCOME_CREDITS: Joi.number().integer().min(0).optional(),
        SENTRY_DSN: Joi.string().allow('').optional(),
        PORT: Joi.number().default(3000),
        RESEND_API_KEY: Joi.string().allow('').optional(),
        AWS_REGION: Joi.string().allow('').optional(),
        AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
        AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
        AWS_S3_BUCKET: Joi.string().allow('').optional(),
        CLOUDFRONT_URL: Joi.string().allow('').optional(),
        STRIPE_SECRET_KEY: Joi.string().allow('').optional(),
        STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),
        STRIPE_PUBLISHABLE_KEY: Joi.string().allow('').optional(),
      }),
    }),
    // Global rate limiting: 60 req/min by default (auth endpoints override to 5/min)
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 60,
      },
    ]),
    // Structured JSON request logging via pino
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { colorize: true, singleLine: true },
              }
            : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        redact: ['req.headers.authorization'],
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    JobsModule,
    LeadsModule,
    QuotesModule,
    MessagingModule,
    ReviewsModule,
    QuestionsModule,
    PaymentsModule,
    NotificationsModule,
    UploadsModule,
    SearchModule,
    AdminModule,
    MaintenanceModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Apply ThrottlerGuard globally; individual controllers/routes override via @Throttle()
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
