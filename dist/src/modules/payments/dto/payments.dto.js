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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAutoTopupDto = exports.CreateCheckoutDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const stripe_service_js_1 = require("../stripe.service.js");
const VALID_CREDIT_AMOUNTS = stripe_service_js_1.CREDIT_PACKS.map((p) => p.credits);
class CreateCheckoutDto {
    creditAmount;
}
exports.CreateCheckoutDto = CreateCheckoutDto;
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsIn)(VALID_CREDIT_AMOUNTS, {
        message: `creditAmount must be one of: ${VALID_CREDIT_AMOUNTS.join(', ')}`,
    }),
    __metadata("design:type", Number)
], CreateCheckoutDto.prototype, "creditAmount", void 0);
class UpdateAutoTopupDto {
    enabled;
    topupAmount;
    topupThreshold;
}
exports.UpdateAutoTopupDto = UpdateAutoTopupDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAutoTopupDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateAutoTopupDto.prototype, "topupAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateAutoTopupDto.prototype, "topupThreshold", void 0);
//# sourceMappingURL=payments.dto.js.map