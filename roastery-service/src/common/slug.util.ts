/** `name` -> lowercase, non-alfanumerik jadi `-`, trim `-` di ujung. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Bikin slug unik: cek fungsi `exists(slug)` (query DB), kalau sudah ada
 * tambahkan suffix -2, -3, dst sampai ketemu yang belum dipakai.
 */
export async function uniqueSlug(
  name: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
