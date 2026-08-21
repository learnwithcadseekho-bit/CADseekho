// Minimal in-memory cache for public read endpoints — avoids re-fetching the
// same content from Supabase on every page navigation within a session,
// which was the main cause of visible lag/flash when switching pages. Not
// used for admin listings or per-user data, which must always be fresh.
const store = new Map<string, { data: unknown; expires: number }>();

export async function cached<T>(key: string, fetcher: () => Promise<T>, ttlMs = 60_000): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.data as T;

  const data = await fetcher();
  store.set(key, { data, expires: Date.now() + ttlMs });
  return data;
}
