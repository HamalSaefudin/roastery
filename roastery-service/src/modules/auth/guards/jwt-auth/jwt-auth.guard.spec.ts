import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function mockContext(cookies: Record<string, string> = {}): {
  ctx: ExecutionContext;
  request: { cookies: Record<string, string>; user?: unknown };
} {
  const request: { cookies: Record<string, string>; user?: unknown } = { cookies };
  const ctx = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { ctx, request };
}

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let jwtService: JwtService;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = new Reflector();
    jwtService = { verify: jest.fn() } as unknown as JwtService;
    guard = new JwtAuthGuard(jwtService, reflector);
  });

  it('lolos tanpa cek cookie sama sekali kalau endpoint @Public()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const { ctx } = mockContext();
    expect(guard.canActivate(ctx)).toBe(true);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('lempar 401 kalau tidak ada cookie access_token', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const { ctx } = mockContext();
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('lempar 401 kalau token invalid/expired (jwtService.verify throw)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    (jwtService.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const { ctx } = mockContext({ access_token: 'token-rusak' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('lolos & nempel request.user kalau token valid', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: 'user-1',
      email: 'a@a.com',
      role: 'retail',
    });
    const { ctx, request } = mockContext({ access_token: 'token-valid' });
    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.user).toEqual({ id: 'user-1', email: 'a@a.com', role: 'retail' });
  });
});
