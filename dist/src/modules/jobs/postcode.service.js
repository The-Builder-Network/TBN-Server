"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostcodeService = void 0;
const common_1 = require("@nestjs/common");
let PostcodeService = class PostcodeService {
    async geocode(postcode) {
        const normalised = postcode.trim().toUpperCase().replace(/\s+/g, ' ');
        const encoded = encodeURIComponent(normalised);
        let response;
        try {
            response = await fetch(`https://api.postcodes.io/postcodes/${encoded}`);
        }
        catch {
            throw new common_1.BadRequestException('Could not reach postcode lookup service');
        }
        if (!response.ok) {
            throw new common_1.BadRequestException(`Invalid postcode: ${postcode}`);
        }
        const body = (await response.json());
        const result = body.result;
        if (!result) {
            throw new common_1.BadRequestException(`Invalid postcode: ${postcode}`);
        }
        const placeName = result.parish ??
            result.admin_ward ??
            result.admin_district ??
            normalised;
        return {
            latitude: result.latitude,
            longitude: result.longitude,
            placeName,
        };
    }
};
exports.PostcodeService = PostcodeService;
exports.PostcodeService = PostcodeService = __decorate([
    (0, common_1.Injectable)()
], PostcodeService);
//# sourceMappingURL=postcode.service.js.map