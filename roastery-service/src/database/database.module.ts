import { Global, Inject, Module } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DRIZZLE, PG_POOL } from './drizzle.constants';
import * as schema from './schema';

/**
 * Modul database global.
 * Membuat connection pool PostgreSQL dan menyediakan instance Drizzle
 * lewat token DRIZZLE agar bisa di-inject di service mana pun.
 *
 * Catatan: pg.Pool bersifat lazy — koneksi baru dibuka saat query pertama,
 * jadi app tetap bisa boot walau database belum jalan.
 * Pool ditutup rapi saat aplikasi shutdown (onModuleDestroy) — penting untuk
 * graceful shutdown production dan supaya test (Jest) tidak menggantung.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({ connectionString: config.getOrThrow<string>('DATABASE_URL') }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}
