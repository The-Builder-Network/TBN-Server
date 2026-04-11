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
const VALID_SERVICE_SLUGS = new Set([
    'architectural-services',
    'bathroom-fitting',
    'bricklaying-repointing',
    'carpentry-joinery',
    'carpets-lino-flooring',
    'central-heating',
    'chimney-fireplace',
    'cleaning-services',
    'conservatories',
    'conversions',
    'damp-proofing',
    'demolition-clearance',
    'driveways-paving',
    'electrical',
    'extensions',
    'fascias-soffits-guttering',
    'fencing',
    'gardening-landscaping',
    'gas-works',
    'groundwork-foundations',
    'handyman',
    'insulation',
    'kitchen-fitting',
    'locksmith',
    'loft-conversion',
    'moving-services',
    'new-build',
    'painting-decorating',
    'plastering-rendering',
    'plumbing',
    'restoration-refurbishment',
    'roofing',
    'security-systems',
    'stonemasonry',
    'tiling',
    'tree-surgery',
    'windows-door-fitting',
]);
async function main() {
    const all = await prisma.tradespersonService.findMany({
        select: { id: true, serviceSlug: true, tradespersonProfileId: true },
    });
    const invalid = all.filter((s) => !VALID_SERVICE_SLUGS.has(s.serviceSlug));
    if (invalid.length === 0) {
        console.log('No invalid service slugs found. Nothing to clean up.');
        return;
    }
    console.log(`Found ${invalid.length} invalid service row(s):`);
    invalid.forEach((s) => console.log(`  id=${s.id}  serviceSlug="${s.serviceSlug}"`));
    const { count } = await prisma.tradespersonService.deleteMany({
        where: { id: { in: invalid.map((s) => s.id) } },
    });
    console.log(`\nDeleted ${count} row(s) with invalid service slugs.`);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=cleanup-service-slugs.js.map