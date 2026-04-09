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
exports.QuestionsController = void 0;
const common_1 = require("@nestjs/common");
const questions_service_js_1 = require("./questions.service.js");
const jwt_auth_guard_js_1 = require("../auth/guards/jwt-auth.guard.js");
const optional_jwt_auth_guard_js_1 = require("../auth/guards/optional-jwt-auth.guard.js");
const roles_guard_js_1 = require("../auth/guards/roles.guard.js");
const roles_decorator_js_1 = require("../auth/decorators/roles.decorator.js");
const current_user_decorator_js_1 = require("../auth/decorators/current-user.decorator.js");
const create_question_dto_js_1 = require("./dto/create-question.dto.js");
const get_questions_query_dto_js_1 = require("./dto/get-questions-query.dto.js");
const create_answer_dto_js_1 = require("./dto/create-answer.dto.js");
let QuestionsController = class QuestionsController {
    questionsService;
    constructor(questionsService) {
        this.questionsService = questionsService;
    }
    async createQuestion(user, dto) {
        return this.questionsService.createQuestion(user.sub, dto);
    }
    async getQuestions(query) {
        return this.questionsService.getQuestions(query);
    }
    async getQuestion(id, user) {
        return this.questionsService.getQuestion(id, user?.sub);
    }
    async createAnswer(user, questionId, dto) {
        return this.questionsService.createAnswer(questionId, user.sub, dto);
    }
    async toggleLike(user, answerId) {
        return this.questionsService.toggleAnswerLike(answerId, user.sub);
    }
    async markBest(user, answerId) {
        return this.questionsService.markBestAnswer(answerId, user.sub);
    }
};
exports.QuestionsController = QuestionsController;
__decorate([
    (0, common_1.Post)('questions'),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe({ transform: true, whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_question_dto_js_1.CreateQuestionDto]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "createQuestion", null);
__decorate([
    (0, common_1.Get)('questions'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_js_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({ transform: true, whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_questions_query_dto_js_1.GetQuestionsQueryDto]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "getQuestions", null);
__decorate([
    (0, common_1.Get)('questions/:id'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_js_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "getQuestion", null);
__decorate([
    (0, common_1.Post)('questions/:id/answers'),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard, roles_guard_js_1.RolesGuard),
    (0, roles_decorator_js_1.Roles)('TRADESPERSON'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)(new common_1.ValidationPipe({ transform: true, whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_answer_dto_js_1.CreateAnswerDto]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "createAnswer", null);
__decorate([
    (0, common_1.Post)('answers/:id/like'),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "toggleLike", null);
__decorate([
    (0, common_1.Patch)('answers/:id/best'),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "markBest", null);
exports.QuestionsController = QuestionsController = __decorate([
    (0, common_1.Controller)('api/v1'),
    __metadata("design:paramtypes", [questions_service_js_1.QuestionsService])
], QuestionsController);
//# sourceMappingURL=questions.controller.js.map