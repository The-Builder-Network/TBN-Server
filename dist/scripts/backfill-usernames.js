"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = __importDefault(require("pg"));
const pool = new pg_1.default.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    const users = await prisma.user.findMany({
        include: { tradespersonProfile: { select: { username: true } } },
        orderBy: { createdAt: 'asc' },
    });
    console.log('Total users:', users.length);
    const taken = new Set();
    for (const u of users) {
        let candidate = u.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!candidate)
            candidate = 'user';
        let final = candidate;
        let n = 2;
        while (taken.has(final)) {
            final = `${candidate}${n}`;
            n++;
        }
        taken.add(final);
        await prisma.user.update({
            where: { id: u.id },
            data: { username: final },
        });
        if (u.tradespersonProfile) {
            await prisma.tradespersonProfile.update({
                where: { userId: u.id },
                data: { username: final },
            });
        }
        console.log(`Updated: "${u.name}" -> "${final}"`);
    }
    console.log('Done!');
}
main()
    .then(() => process.exit(0))
    .catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=backfill-usernames.js.map