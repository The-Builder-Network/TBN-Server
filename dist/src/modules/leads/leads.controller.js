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
exports.LeadsController = void 0;
const common_1 = require("@nestjs/common");
const leads_service_js_1 = require("./leads.service.js");
const jwt_auth_guard_js_1 = require("../auth/guards/jwt-auth.guard.js");
const roles_guard_js_1 = require("../auth/guards/roles.guard.js");
const roles_decorator_js_1 = require("../auth/decorators/roles.decorator.js");
const current_user_decorator_js_1 = require("../auth/decorators/current-user.decorator.js");
const get_leads_query_dto_js_1 = require("./dto/get-leads-query.dto.js");
const express_interest_dto_js_1 = require("./dto/express-interest.dto.js");
let LeadsController = class LeadsController {
    leadsService;
    constructor(leadsService) {
        this.leadsService = leadsService;
    }
    async countLeads(postcode, radius) {
        const radiusNum = Math.min(Math.max(parseInt(radius || '30', 10), 1), 200);
        const count = await this.leadsService.countAvailableLeadsNear(postcode || '', radiusNum);
        return { count };
    }
    async getLeads(user, query) {
        return this.leadsService.getLeads(user.sub, query);
    }
    async getLead(user, id) {
        return this.leadsService.getLead(id, user.sub);
    }
    async expressInterest(user, id, dto) {
        return this.leadsService.expressInterest(id, user.sub, dto);
    }
};
exports.LeadsController = LeadsController;
__decorate([
    (0, common_1.Get)('count'),
    __param(0, (0, common_1.Query)('postcode')),
    __param(1, (0, common_1.Query)('radius')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "countLeads", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard, roles_guard_js_1.RolesGuard),
    (0, roles_decorator_js_1.Roles)('TRADESPERSON'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Query)(new common_1.ValidationPipe({ transform: true, whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, get_leads_query_dto_js_1.GetLeadsQueryDto]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getLeads", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard, roles_guard_js_1.RolesGuard),
    (0, roles_decorator_js_1.Roles)('TRADESPERSON'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getLead", null);
__decorate([
    (0, common_1.Post)(':id/express-interest'),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard, roles_guard_js_1.RolesGuard),
    (0, roles_decorator_js_1.Roles)('TRADESPERSON'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)(new common_1.ValidationPipe({ transform: true, whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, express_interest_dto_js_1.ExpressInterestDto]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "expressInterest", null);
exports.LeadsController = LeadsController = __decorate([
    (0, common_1.Controller)('api/v1/leads'),
    __metadata("design:paramtypes", [leads_service_js_1.LeadsService])
], LeadsController);
//# sourceMappingURL=leads.controller.js.map