"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const nestjs_pino_1 = require("nestjs-pino");
const Joi = __importStar(require("joi"));
const prisma_module_js_1 = require("./prisma/prisma.module.js");
const health_controller_js_1 = require("./health/health.controller.js");
const auth_module_js_1 = require("./modules/auth/auth.module.js");
const users_module_js_1 = require("./modules/users/users.module.js");
const jobs_module_js_1 = require("./modules/jobs/jobs.module.js");
const leads_module_js_1 = require("./modules/leads/leads.module.js");
const quotes_module_js_1 = require("./modules/quotes/quotes.module.js");
const messaging_module_js_1 = require("./modules/messaging/messaging.module.js");
const reviews_module_js_1 = require("./modules/reviews/reviews.module.js");
const questions_module_js_1 = require("./modules/questions/questions.module.js");
const payments_module_js_1 = require("./modules/payments/payments.module.js");
const notifications_module_js_1 = require("./modules/notifications/notifications.module.js");
const uploads_module_js_1 = require("./modules/uploads/uploads.module.js");
const search_module_js_1 = require("./modules/search/search.module.js");
const admin_module_js_1 = require("./modules/admin/admin.module.js");
const maintenance_module_js_1 = require("./modules/maintenance/maintenance.module.js");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validationSchema: Joi.object({
                    DATABASE_URL: Joi.string().required(),
                    JWT_SECRET: Joi.string().required(),
                    FRONTEND_URL: Joi.string().required(),
                    PORT: Joi.number().default(3000),
                    RESEND_API_KEY: Joi.string().allow('').optional(),
                    R2_ACCOUNT_ID: Joi.string().allow('').optional(),
                    R2_ACCESS_KEY_ID: Joi.string().allow('').optional(),
                    R2_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
                    R2_BUCKET_NAME: Joi.string().allow('').optional(),
                    R2_PUBLIC_URL: Joi.string().allow('').optional(),
                    R2_ENDPOINT: Joi.string().allow('').optional(),
                    STRIPE_SECRET_KEY: Joi.string().allow('').optional(),
                    STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),
                }),
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'default',
                    ttl: 60_000,
                    limit: 60,
                },
            ]),
            nestjs_pino_1.LoggerModule.forRoot({
                pinoHttp: {
                    transport: process.env.NODE_ENV !== 'production'
                        ? {
                            target: 'pino-pretty',
                            options: { colorize: true, singleLine: true },
                        }
                        : undefined,
                    level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
                    redact: ['req.headers.authorization'],
                },
            }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_js_1.PrismaModule,
            auth_module_js_1.AuthModule,
            users_module_js_1.UsersModule,
            jobs_module_js_1.JobsModule,
            leads_module_js_1.LeadsModule,
            quotes_module_js_1.QuotesModule,
            messaging_module_js_1.MessagingModule,
            reviews_module_js_1.ReviewsModule,
            questions_module_js_1.QuestionsModule,
            payments_module_js_1.PaymentsModule,
            notifications_module_js_1.NotificationsModule,
            uploads_module_js_1.UploadsModule,
            search_module_js_1.SearchModule,
            admin_module_js_1.AdminModule,
            maintenance_module_js_1.MaintenanceModule,
        ],
        controllers: [health_controller_js_1.HealthController],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map