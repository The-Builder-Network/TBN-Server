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
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const search_service_js_1 = require("./search.service.js");
const search_tradespeople_query_dto_js_1 = require("./dto/search-tradespeople-query.dto.js");
let SearchController = class SearchController {
    searchService;
    constructor(searchService) {
        this.searchService = searchService;
    }
    async searchTradespeople(query) {
        return this.searchService.searchTradespeople(query);
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)('tradespeople'),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({ transform: true, whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_tradespeople_query_dto_js_1.SearchTradespeopleQueryDto]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "searchTradespeople", null);
exports.SearchController = SearchController = __decorate([
    (0, common_1.Controller)('api/v1/search'),
    __metadata("design:paramtypes", [search_service_js_1.SearchService])
], SearchController);
//# sourceMappingURL=search.controller.js.map