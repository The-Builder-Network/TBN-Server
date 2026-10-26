import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private config: ConfigService) {
    const pool = new pg.Pool({
      connectionString: config.get<string>('DATABASE_URL'),
      max: 10,
      // Neon suspends idle compute; the first connection after a pause can take a few seconds.
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 30_000,
    });
    const adapter = new PrismaPg(pool);
    super({
      adapter,
      // Prisma's defaults (2s to start, 5s to run) fail on Neon cold starts and slow links;
      // generous ceilings make a slow network slow rather than broken.
      transactionOptions: { maxWait: 15_000, timeout: 45_000 },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
