import type { CookieOptions } from 'express';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const isProd = process.env.NODE_ENV === 'production';

export const ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  path: '/',
  maxAge: 15 * 60 * 1000, // 15 menit
};

export const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
};

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
