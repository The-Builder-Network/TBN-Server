"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingModule = void 0;
const common_1 = require("@nestjs/common");
const messaging_service_js_1 = require("./messaging.service.js");
const messaging_controller_js_1 = require("./messaging.controller.js");
const chat_gateway_js_1 = require("./chat.gateway.js");
const auth_module_js_1 = require("../auth/auth.module.js");
const prisma_module_js_1 = require("../../prisma/prisma.module.js");
const notifications_module_js_1 = require("../notifications/notifications.module.js");
let MessagingModule = class MessagingModule {
};
exports.MessagingModule = MessagingModule;
exports.MessagingModule = MessagingModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_js_1.AuthModule, prisma_module_js_1.PrismaModule, notifications_module_js_1.NotificationsModule],
        controllers: [messaging_controller_js_1.MessagingController],
        providers: [messaging_service_js_1.MessagingService, chat_gateway_js_1.ChatGateway],
        exports: [messaging_service_js_1.MessagingService],
    })
], MessagingModule);
//# sourceMappingURL=messaging.module.js.map