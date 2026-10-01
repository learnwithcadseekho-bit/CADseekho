// Minimal in-memory cache for public read endpoints — avoids re-fetching the
// same content from Supabase on every page navigation within a session,
// which was the main cause of visible lag/flash when switching pages. Not
// used for admin listings or per-user data, which must always be fresh.
//
// It also carries server-rendered data to the browser: the build-time
// prerender (scripts/prerender.mjs) renders each page, collects every entry
// it fetched, and embeds them as JSON in the page. On load the store is seeded
// from that JSON so the first client render matches the HTML exactly (needed
// for hydration); seeded entries start expired, so they're revalidated in the
// background right after hydration and visitors never see build-time data for
// long.
const store = new Map<string, { data: unknown; expires: number }>();
const inflight = new Map<string, Promise<unknown>>();

export const SSR_DATA_ELEMENT_ID = "__CADSEEKHO_DATA__";

if (!import.meta.env.SSR && typeof document !== "undefined") {
  const el = document.getElementById(SSR_DATA_ELEMENT_ID);
  if (el?.textContent) {
    try {
      const seed = JSON.parse(el.textContent) as Record<string, unknown>;
      for (const [key, data] of Object.entries(seed)) store.set(key, { data, expires: 0 });
    } catch {
      // A malformed snapshot just means a normal client-side fetch.
    }
  }
}

export async function cached<T>(key: string, fetcher: () => Promise<T>, ttlMs = 60_000): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.data as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const request: Promise<T> = fetcher()
    .then((data) => {
      // During the build every fetched entry must survive the whole render.
      store.set(key, { data, expires: import.meta.env.SSR ? Infinity : Date.now() + ttlMs });
      return data;
    })
    .finally(() => {
      if (inflight.get(key) === request) inflight.delete(key);
    });
  inflight.set(key, request);
  return request;
}

/** Synchronous read, including expired entries (used for the first render). */
export function peek<T>(key: string): { data: T } | undefined {
  const hit = store.get(key);
  return hit ? { data: hit.data as T } : undefined;
}

export function isFresh(key: string): boolean {
  const hit = store.get(key);
  return Boolean(hit && hit.expires > Date.now());
}

// ---------------------------------------------------------------------------
// Build-time (SSR) support. Components can't await during render, so on the
// server useCachedData registers what it needs here; the prerender awaits it
// and renders again until a pass registers nothing new.

const ssrPending = new Map<string, Promise<unknown>>();
const ssrErrors = new Map<string, unknown>();

export function registerSsrFetch(key: string, fetcher: () => Promise<unknown>) {
  if (ssrPending.has(key) || ssrErrors.has(key)) return;
  ssrPending.set(
    key,
    cached(key, fetcher).catch((err) => {
      ssrErrors.set(key, err);
    })
  );
}

export function ssrError(key: string): unknown {
  return ssrErrors.get(key);
}

/** Awaits everything registered since the last call; false if nothing was pending. */
export async function flushSsrFetches(): Promise<boolean> {
  if (ssrPending.size === 0) return false;
  const all = [...ssrPending.values()];
  ssrPending.clear();
  await Promise.all(all);
  return true;
}

export function ssrErrorKeys(): string[] {
  return [...ssrErrors.keys()];
}

// Keys read while rendering the current page. The store itself is shared
// across all pages of a build (so e.g. categories are fetched once), but each
// page only embeds the entries it actually rendered with.
const ssrTouched = new Set<string>();

export function touchSsrKey(key: string) {
  ssrTouched.add(key);
}

/** Entries the current page rendered with, minus keys it doesn't need to embed. */
export function dumpTouched(exclude: (key: string) => boolean = () => false): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ssrTouched) {
    const entry = store.get(key);
    if (entry && !exclude(key)) out[key] = entry.data;
  }
  return out;
}

/** Call before rendering each page. Fetched data stays cached; errors are retried. */
export function startSsrPage() {
  ssrTouched.clear();
  ssrPending.clear();
  ssrErrors.clear();
}
