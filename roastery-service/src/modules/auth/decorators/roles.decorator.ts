import { SetMetadata } from '@nestjs/common';
import type { userRoleEnum } from '../auth.schema';

export type UserRole = (typeof userRoleEnum.enumValues)[number];

export const ROLES_KEY = 'roles';

/** Batasi endpoint hanya untuk role tertentu. Dipakai bareng RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
