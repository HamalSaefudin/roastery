const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Parse query param `page` (default 1, minimal 1). */
export function parsePage(value?: string): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** Parse query param `limit` (default 20, maksimal 100). */
export function parseLimit(value?: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(n, MAX_PAGE_SIZE);
}

export function paginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}
