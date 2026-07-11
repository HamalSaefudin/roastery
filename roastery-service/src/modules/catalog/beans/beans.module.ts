import { Module } from '@nestjs/common';
import { BeansService } from './beans.service';
import { BeansController } from './beans.controller';

@Module({
  providers: [BeansService],
  controllers: [BeansController]
})
export class BeansModule {}
