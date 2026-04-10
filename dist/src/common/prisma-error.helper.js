"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePrismaError = handlePrismaError;
const client_1 = require("@prisma/client");
const common_1 = require("@nestjs/common");
function handlePrismaError(err) {
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002':
                throw new common_1.ConflictException('A record with this value already exists.');
            case 'P2025':
                throw new common_1.NotFoundException('Record not found.');
        }
    }
    throw err;
}
//# sourceMappingURL=prisma-error.helper.js.map