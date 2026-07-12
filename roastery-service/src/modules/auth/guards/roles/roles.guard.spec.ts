import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import type { RequestUser } from '../../decorators/current-user.decorator';

function mockContext(user?: RequestUser): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('lolos kalau endpoint tidak punya @Roles (tidak ada batasan role)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(
      guard.canActivate(
        mockContext({ id: '1', email: 'a@a.com', role: 'retail' }),
      ),
    ).toBe(true);
  });

  it('lolos kalau @Roles array kosong', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    expect(
      guard.canActivate(
        mockContext({ id: '1', email: 'a@a.com', role: 'retail' }),
      ),
    ).toBe(true);
  });

  it('lempar 403 kalau role user tidak termasuk yang diizinkan', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['staff', 'admin']);
    expect(() =>
      guard.canActivate(
        mockContext({ id: '1', email: 'a@a.com', role: 'retail' }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('lempar 403 kalau request.user tidak ada (belum login)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['staff']);
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('lolos kalau role user termasuk yang diizinkan', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['staff', 'admin']);
    expect(
      guard.canActivate(
        mockContext({ id: '1', email: 'a@a.com', role: 'staff' }),
      ),
    ).toBe(true);
  });
});
