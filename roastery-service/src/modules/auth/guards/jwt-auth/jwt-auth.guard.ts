import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../../auth.constants';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import type { RequestUser } from '../../decorators/current-user.decorator';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Belum login');
    }

    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token);
      const user: RequestUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      (request as Request & { user: RequestUser }).user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Sesi tidak valid, silakan login ulang');
    }
  }
}
