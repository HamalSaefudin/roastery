import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Tandai endpoint yang skip JwtAuthGuard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
