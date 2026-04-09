"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsModule = void 0;
const common_1 = require("@nestjs/common");
const jobs_controller_js_1 = require("./jobs.controller.js");
const jobs_service_js_1 = require("./jobs.service.js");
const postcode_service_js_1 = require("./postcode.service.js");
const uploads_module_js_1 = require("../uploads/uploads.module.js");
let JobsModule = class JobsModule {
};
exports.JobsModule = JobsModule;
exports.JobsModule = JobsModule = __decorate([
    (0, common_1.Module)({
        imports: [uploads_module_js_1.UploadsModule],
        controllers: [jobs_controller_js_1.JobsController],
        providers: [jobs_service_js_1.JobsService, postcode_service_js_1.PostcodeService],
        exports: [jobs_service_js_1.JobsService],
    })
], JobsModule);
//# sourceMappingURL=jobs.module.js.map