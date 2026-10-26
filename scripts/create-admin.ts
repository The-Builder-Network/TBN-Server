/**
 * Create (or reset the password of) an admin account.
 *   pnpm tsx scripts/create-admin.ts [email] [name]
 * Prints nothing secret: the generated password is written to .admin-credentials (git-ignored).
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);

async function main() {
  const email = (process.argv[2] ?? 'admin@thebuildernetwork.com').toLowerCase();
  const name = process.argv[3] ?? 'TBN Admin';
  const password = randomBytes(18).toString('base64url');
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== 'ADMIN') {
    throw new Error(`${email} already exists as ${existing.role}; refusing to promote it`);
  }
  await prisma.user.upsert({
    where: { email },
    create: { email, name, role: 'ADMIN', passwordHash, emailVerified: true },
    update: { passwordHash, tokenVersion: { increment: 1 }, accountStatus: 'ACTIVE' },
  });
  writeFileSync('.admin-credentials', `ADMIN_EMAIL=${email}\nADMIN_PASSWORD=${password}\n`);
  console.log(`✓ Admin ${existing ? 'password reset' : 'created'}: ${email}`);
  console.log('  Password written to .admin-credentials (git-ignored). Change it after first login.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
