import { Module } from '@nestjs/common';
import { RepairsService } from './repairs.service';
import { RepairsController } from './repairs.controller';

@Module({
  providers: [RepairsService],
  controllers: [RepairsController],
})
export class RepairsModule {}
