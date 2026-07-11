import { Module } from '@nestjs/common';
import { GrindersService } from './grinders.service';
import { GrindersController } from './grinders.controller';

@Module({
  providers: [GrindersService],
  controllers: [GrindersController]
})
export class GrindersModule {}
