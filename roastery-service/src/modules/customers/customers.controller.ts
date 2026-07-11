import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import {
  CreateWholesaleApplicationDto,
  DecideWholesaleApplicationDto,
} from './dto/wholesale-application.dto';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePage(value?: string): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

function parseLimit(value?: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(n, MAX_PAGE_SIZE);
}

function mapProfile(profile: {
  id: string;
  userId: string;
  code: string;
  fullName: string;
  phone: string | null;
  customerType: string;
  createdAt: Date;
}) {
  return {
    id: profile.id,
    userId: profile.userId,
    code: profile.code,
    fullName: profile.fullName,
    phone: profile.phone,
    customerType: profile.customerType,
    createdAt: profile.createdAt,
  };
}

@ApiTags('customers')
@ApiCookieAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: RequestUser) {
    const profile = await this.customersService.getOrCreateProfile(user.id);
    return { profile: mapProfile(profile) };
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.customersService.updateProfile(user.id, dto);
    return { profile: mapProfile(profile) };
  }

  @Get('me/addresses')
  async listMyAddresses(@CurrentUser() user: RequestUser) {
    const profile = await this.customersService.getOrCreateProfile(user.id);
    const addresses = await this.customersService.listAddresses(profile.id);
    return { addresses };
  }

  @Post('me/addresses')
  async createMyAddress(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAddressDto,
  ) {
    const profile = await this.customersService.getOrCreateProfile(user.id);
    const address = await this.customersService.createAddress(profile.id, dto);
    return { address };
  }

  @Patch('me/addresses/:id')
  async updateMyAddress(
    @CurrentUser() user: RequestUser,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const profile = await this.customersService.getOrCreateProfile(user.id);
    const address = await this.customersService.updateAddress(
      profile.id,
      addressId,
      dto,
    );
    return { address };
  }

  @Delete('me/addresses/:id')
  @HttpCode(204)
  async deleteMyAddress(
    @CurrentUser() user: RequestUser,
    @Param('id') addressId: string,
  ) {
    const profile = await this.customersService.getOrCreateProfile(user.id);
    await this.customersService.deleteAddress(profile.id, addressId);
  }

  @Post('me/wholesale-application')
  async createMyWholesaleApplication(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateWholesaleApplicationDto,
  ) {
    const profile = await this.customersService.getOrCreateProfile(user.id);
    const application = await this.customersService.createWholesaleApplication(
      profile.id,
      dto,
    );
    return { application };
  }

  @Get('me/wholesale-application')
  async getMyWholesaleApplication(@CurrentUser() user: RequestUser) {
    const profile = await this.customersService.getOrCreateProfile(user.id);
    const application = await this.customersService.getMyWholesaleApplication(
      profile.id,
    );
    return { application };
  }

  @Get()
  @Roles('staff', 'admin')
  async listCustomers(
    @Query('search') search?: string,
    @Query('type') type?: 'retail' | 'wholesale',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.listCustomers({
      search,
      type,
      page: parsePage(page),
      limit: parseLimit(limit),
    });
  }

  @Get('wholesale-applications')
  @Roles('staff', 'admin')
  async listWholesaleApplications(
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ) {
    const data = await this.customersService.listWholesaleApplications(status);
    return { data };
  }

  @Patch('wholesale-applications/:id')
  @Roles('staff', 'admin')
  async decideWholesaleApplication(
    @CurrentUser() staff: RequestUser,
    @Param('id') applicationId: string,
    @Body() dto: DecideWholesaleApplicationDto,
  ) {
    const application = await this.customersService.decideWholesaleApplication(
      applicationId,
      staff.id,
      dto,
    );
    return { application };
  }
}
