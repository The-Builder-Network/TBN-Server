"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const payments_service_js_1 = require("./payments.service.js");
const jwt_auth_guard_js_1 = require("../auth/guards/jwt-auth.guard.js");
const roles_guard_js_1 = require("../auth/guards/roles.guard.js");
const roles_decorator_js_1 = require("../auth/decorators/roles.decorator.js");
const current_user_decorator_js_1 = require("../auth/decorators/current-user.decorator.js");
const payments_dto_js_1 = require("./dto/payments.dto.js");
let PaymentsController = class PaymentsController {
    paymentsService;
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async getBalance(user) {
        return this.paymentsService.getBalance(user.sub);
    }
    async createCheckout(user, dto) {
        return this.paymentsService.createCheckout(user.sub, dto.creditAmount);
    }
    async handleWebhook(req, signature) {
        const payload = req.rawBody;
        if (!payload) {
            return { received: false };
        }
        await this.paymentsService.handleWebhook(payload, signature);
        return { received: true };
    }
    async getHistory(user, page = '1', perPage = '20') {
        return this.paymentsService.getPaymentHistory(user.sub, parseInt(page, 10), parseInt(perPage, 10));
    }
    async updateAutoTopup(user, dto) {
        return this.paymentsService.updateAutoTopup(user.sub, dto);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Get)('balance'),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard, roles_guard_js_1.RolesGuard),
    (0, roles_decorator_js_1.Roles)('TRADESPERSON'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Post)('checkout'),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard, roles_guard_js_1.RolesGuard),
    (0, roles_decorator_js_1.Roles)('TRADESPERSON'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, payments_dto_js_1.CreateCheckoutDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createCheckout", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('stripe-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard, roles_guard_js_1.RolesGuard),
    (0, roles_decorator_js_1.Roles)('TRADESPERSON'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('perPage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Patch)('auto-topup'),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard, roles_guard_js_1.RolesGuard),
    (0, roles_decorator_js_1.Roles)('TRADESPERSON'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, payments_dto_js_1.UpdateAutoTopupDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "updateAutoTopup", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('api/v1/payments'),
    __metadata("design:paramtypes", [payments_service_js_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map