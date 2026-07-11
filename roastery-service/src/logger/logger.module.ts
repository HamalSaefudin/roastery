import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

/**
 * Structured logging global (Pino). Setelah `app.useLogger()` di main.ts,
 * `new Logger(ClassName.name)` dari '@nestjs/common' di mana pun otomatis
 * kepakai lewat Pino — tidak perlu import khusus di modul lain.
 * Redact cookie/authorization/password supaya token & credential tidak kebocor ke log.
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            level: config.get<string>('LOG_LEVEL', isProd ? 'info' : 'debug'),
            transport: isProd
              ? undefined
              : { target: 'pino-pretty', options: { colorize: true, singleLine: true } },
            redact: {
              paths: [
                'req.headers.cookie',
                'req.headers.authorization',
                'res.headers["set-cookie"]',
                'req.body.password',
              ],
              remove: true,
            },
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
