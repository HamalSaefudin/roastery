import { Test } from '@nestjs/testing';
import type { TestingModuleBuilder } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';

/**
 * Bootstrap NestApplication untuk e2e test — replikasi setup src/main.ts
 * (prefix /api, cookie-parser, ValidationPipe) TANPA Swagger.
 * DATABASE_URL diarahkan ke DB test lewat env var (lihat package.json "test:e2e").
 */
export async function createTestApp(
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (configure) {
    builder = configure(builder);
  }
  const moduleFixture = await builder.compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}
