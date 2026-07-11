import { Module } from '@nestjs/common';
import { OriginsService } from './origins.service';
import { OriginsController } from './origins.controller';

@Module({
  providers: [OriginsService],
  controllers: [OriginsController]
})
export class OriginsModule {}
