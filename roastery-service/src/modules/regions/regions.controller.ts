import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { RegionsService } from './regions.service';

// Semua endpoint di sini publik (dipakai form alamat sebelum login) — lihat docs/00. Regions/api-contract.md.
@Public()
@ApiTags('regions')
@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get('provinces')
  async findAllProvinces() {
    const data = await this.regionsService.findAllProvinces();
    return { data };
  }

  @Get('regencies')
  async findRegencies(@Query('provinceCode') provinceCode?: string) {
    const data = await this.regionsService.findRegencies(provinceCode);
    return { data };
  }

  @Get('districts')
  async findDistricts(@Query('regencyCode') regencyCode?: string) {
    const data = await this.regionsService.findDistricts(regencyCode);
    return { data };
  }

  @Get('villages')
  async findVillages(@Query('districtCode') districtCode?: string) {
    const data = await this.regionsService.findVillages(districtCode);
    return { data };
  }

  @Get('search')
  async search(@Query('q') q?: string, @Query('level') level?: string) {
    const data = await this.regionsService.search(q, level);
    return { data };
  }
}
