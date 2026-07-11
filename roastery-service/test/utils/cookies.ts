import type request from 'supertest';

/** Ambil cookie dari response Set-Cookie, siap dipakai lagi di request berikutnya. */
export function extractCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}
