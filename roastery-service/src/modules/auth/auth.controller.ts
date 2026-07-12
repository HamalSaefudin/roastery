import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './decorators/current-user.decorator';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_OPTIONS,
} from './auth.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      REFRESH_TOKEN_COOKIE_OPTIONS,
    );
  }

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.register(dto);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.login(dto);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const currentRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as
      string | undefined;
    const { accessToken, refreshToken } =
      await this.authService.refresh(currentRefreshToken);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const currentRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as
      string | undefined;
    await this.authService.logout(currentRefreshToken);
    res.clearCookie(ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE_OPTIONS);
  }

  @Get('me')
  @ApiCookieAuth()
  async me(@CurrentUser() currentUser: RequestUser) {
    const user = await this.authService.getMe(currentUser.id);
    return { user };
  }
}
