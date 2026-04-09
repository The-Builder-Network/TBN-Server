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
exports.QuotesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_js_1 = require("../auth/guards/jwt-auth.guard.js");
const roles_guard_js_1 = require("../auth/guards/roles.guard.js");
const roles_decorator_js_1 = require("../auth/decorators/roles.decorator.js");
const current_user_decorator_js_1 = require("../auth/decorators/current-user.decorator.js");
const quotes_service_js_1 = require("./quotes.service.js");
const update_quote_status_dto_js_1 = require("./dto/update-quote-status.dto.js");
let QuotesController = class QuotesController {
    quotesService;
    constructor(quotesService) {
        this.quotesService = quotesService;
    }
    async getQuotesForJob(jobId, user) {
        return this.quotesService.getQuotesForJob(jobId, user.sub);
    }
    async updateQuoteStatus(id, user, dto) {
        switch (dto.status) {
            case 'ACCEPTED':
                return this.quotesService.acceptQuote(id, user.sub);
            case 'DECLINED':
                return this.quotesService.declineQuote(id, user.sub);
            case 'WITHDRAWN':
                return this.quotesService.withdrawQuote(id, user.sub);
        }
    }
};
exports.QuotesController = QuotesController;
__decorate([
    (0, common_1.Get)('jobs/:jobId/quotes'),
    (0, roles_decorator_js_1.Roles)('HOMEOWNER'),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], QuotesController.prototype, "getQuotesForJob", null);
__decorate([
    (0, common_1.Patch)('quotes/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Body)(new common_1.ValidationPipe({ transform: true, whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_quote_status_dto_js_1.UpdateQuoteStatusDto]),
    __metadata("design:returntype", Promise)
], QuotesController.prototype, "updateQuoteStatus", null);
exports.QuotesController = QuotesController = __decorate([
    (0, common_1.Controller)('api/v1'),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard, roles_guard_js_1.RolesGuard),
    __metadata("design:paramtypes", [quotes_service_js_1.QuotesService])
], QuotesController);
//# sourceMappingURL=quotes.controller.js.map