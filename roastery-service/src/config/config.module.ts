import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

/**
 * Modul konfigurasi terpusat.
 * Membaca file .env dan menyediakan ConfigService secara global,
 * sehingga modul lain (mis. database) bisa inject ConfigService.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
})
export class ConfigModule {}
