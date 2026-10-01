import { useEffect, useRef, useState } from "react";
import { cached, isFresh, peek, registerSsrFetch, ssrError, touchSsrKey } from "@/lib/cache";

interface CachedDataState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
}

// Loads public data through the shared cache in a way that also works for the
// build-time prerender:
// - Server: renders synchronously from the cache and registers anything
//   missing, so the prerender can fetch it and render the page again.
// - Browser: the first render reads the cache synchronously (seeded from the
//   page's embedded JSON), so hydration matches the server HTML; stale entries
//   are then revalidated in the background.
// Pass `null` as the key to skip loading (e.g. until a menu opens).
// `data` is undefined while loading; fetchers that find nothing should return null.
export function useCachedData<T>(name: string | null, fetcher: () => Promise<T>): CachedDataState<T> {
  // Namespaced so it never collides with the services' own cached() keys.
  const key = name === null ? null : `use:${name}`;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [state, setState] = useState<{ key: string | null; data: T | undefined; error: unknown }>(() => ({
    key,
    data: key ? peek<T>(key)?.data : undefined,
    error: undefined,
  }));

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    if (isFresh(key)) {
      const hit = peek<T>(key);
      setState((s) => (s.key === key && s.data === hit?.data ? s : { key, data: hit?.data, error: undefined }));
      return;
    }
    cached(key, () => fetcherRef.current())
      .then((data) => {
        if (!cancelled) setState({ key, data, error: undefined });
      })
      .catch((error) => {
        if (!cancelled) setState((s) => ({ key, data: s.key === key ? s.data : undefined, error }));
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Effects never run during the prerender, so the server path lives here.
  if (import.meta.env.SSR && key) {
    touchSsrKey(key);
    const hit = peek<T>(key);
    const error = ssrError(key);
    if (!hit && !error) registerSsrFetch(key, () => fetcherRef.current());
    return { data: hit?.data, error, loading: !hit && !error };
  }

  // Key just changed (e.g. client-side navigation to another course): don't
  // show the previous key's data while the effect catches up.
  const current = state.key === key ? state : { key, data: key ? peek<T>(key)?.data : undefined, error: undefined };
  return { data: current.data, error: current.error, loading: Boolean(key) && current.data === undefined && !current.error };
}
