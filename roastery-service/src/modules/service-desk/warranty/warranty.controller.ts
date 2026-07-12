import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WarrantyService } from './warranty.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { RegisterWarrantyDto } from './dto/register-warranty.dto';

@ApiTags('service-desk')
@Controller('service-desk/warranties')
export class WarrantyController {
  constructor(private readonly warrantyService: WarrantyService) {}

  @Post()
  async register(
    @Body() dto: RegisterWarrantyDto,
    @CurrentUser() user: RequestUser,
  ) {
    const warranty = await this.warrantyService.register(user.id, dto);
    return { warranty };
  }

  @Get()
  async listMine(@CurrentUser() user: RequestUser) {
    return this.warrantyService.listMine(user.id);
  }
}
