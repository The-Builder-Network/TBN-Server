import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const users = await prisma.user.findMany({
    include: { tradespersonProfile: { select: { username: true } } },
    orderBy: { createdAt: 'asc' },
  });

  console.log('Total users:', users.length);

  const taken = new Set<string>();

  for (const u of users) {
    let candidate = u.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!candidate) candidate = 'user';

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
