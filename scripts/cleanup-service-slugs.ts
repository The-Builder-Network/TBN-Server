/**
 * Cleanup script: removes tradesperson_services rows where the serviceSlug
 * is not a valid service slug (e.g. old rows that stored trade names like
 * "Bathroom Fitter" instead of valid slugs like "bathroom-fitting").
 *
 * Run: npx ts-node --esm scripts/cleanup-service-slugs.ts
 * Or:  npx tsx scripts/cleanup-service-slugs.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

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
  // Find all rows with invalid slugs
  const all = await prisma.tradespersonService.findMany({
    select: { id: true, serviceSlug: true, tradespersonProfileId: true },
  });

  const invalid = all.filter((s) => !VALID_SERVICE_SLUGS.has(s.serviceSlug));

  if (invalid.length === 0) {
    console.log('No invalid service slugs found. Nothing to clean up.');
    return;
  }

  console.log(`Found ${invalid.length} invalid service row(s):`);
  invalid.forEach((s) =>
    console.log(`  id=${s.id}  serviceSlug="${s.serviceSlug}"`),
  );

  const { count } = await prisma.tradespersonService.deleteMany({
    where: { id: { in: invalid.map((s) => s.id) } },
  });

  console.log(`\nDeleted ${count} row(s) with invalid service slugs.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
