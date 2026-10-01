// Build-time renderer, used only by scripts/prerender.mjs (never shipped to
// the browser). Renders one URL to HTML, re-rendering until every piece of
// data the page needs has been fetched (see useCachedData).
import { Writable } from "node:stream";
import type { ReactElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { AppShell } from "./App";
import { dumpTouched, flushSsrFetches, ssrErrorKeys, startSsrPage } from "@/lib/cache";
import { takeRenderedModules } from "@/lib/trackedLazy";
import { takeSsrStatus } from "@/lib/httpStatus";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

// sanitizeHtml needs a DOM; give it a jsdom window for server rendering.
(globalThis as { __CADSEEKHO_PURIFIER__?: unknown }).__CADSEEKHO_PURIFIER__ = createDOMPurify(
  new JSDOM("").window as unknown as Window & typeof globalThis
);

export { SSR_DATA_ELEMENT_ID } from "@/lib/cache";
export { LEGACY_REDIRECTS } from "@/content/legacyRedirects";

const MAX_PASSES = 8;

function renderToStringAsync(element: ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = "";
    let failed: unknown = null;
    const stream = renderToPipeableStream(element, {
      onAllReady() {
        const sink = new Writable({
          write(chunk, _encoding, callback) {
            html += chunk.toString();
            callback();
          },
        });
        sink.on("finish", () => (failed ? reject(failed) : resolve(html)));
        stream.pipe(sink);
      },
      onShellError: reject,
      onError(error) {
        failed = error;
      },
    });
  });
}

export interface RenderResult {
  html: string;
  helmet: HelmetServerState;
  status: number;
  /** trackedLazy module ids rendered on this page. */
  modules: string[];
  /** Cache entries to embed for hydration. */
  data: Record<string, unknown>;
  /** Cache keys whose fetch failed. */
  errors: string[];
}

export async function render(url: string): Promise<RenderResult> {
  startSsrPage();
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    takeSsrStatus();
    takeRenderedModules();
    const helmetContext: { helmet?: HelmetServerState } = {};
    const html = await renderToStringAsync(
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={url}>
          <AppShell />
        </StaticRouter>
      </HelmetProvider>
    );
    const status = takeSsrStatus();
    const modules = takeRenderedModules();
    if (await flushSsrFetches()) continue;
    return {
      html,
      helmet: helmetContext.helmet!,
      status,
      modules,
      // Article HTML is large and is refetched on the client anyway.
      data: dumpTouched((key) => key.startsWith("use:html:")),
      errors: ssrErrorKeys(),
    };
  }
  throw new Error(`prerender: ${url} still had pending data after ${MAX_PASSES} render passes`);
}

// ---------------------------------------------------------------------------
// Which URLs to prerender. Everything public and indexable; client-only app
// areas (login, dashboard, admin, classroom) are served the plain app shell.

export interface PrerenderRoute {
  path: string;
  /** ISO date for the sitemap's <lastmod>, when the data has one. */
  lastmod?: string;
  /** Source file for static pages, so the prerender can use its git date. */
  source?: string;
  /** Too little content to be worth indexing yet: noindex + left out of the sitemap. */
  thin?: boolean;
}

/** Resource listing pages with fewer published resources than this are noindexed until they fill up. */
const MIN_RESOURCES_TO_INDEX = 2;

export const CANONICAL_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function getPrerenderRoutes(): Promise<{ routes: PrerenderRoute[]; badSlugs: string[] }> {
  const { supabase } = await import("@/lib/supabaseClient");
  const { RESOURCE_TYPES } = await import("@/types/resource");

  const routes: PrerenderRoute[] = [
    { path: "/", source: "src/pages/Home/HomePage.tsx" },
    { path: "/courses", source: "src/pages/Courses/CoursesListingPage.tsx" },
    { path: "/blog", source: "src/pages/Blog/BlogListingPage.tsx" },
    { path: "/resources", source: "src/pages/Resources/ResourcesHubPage.tsx" },
    { path: "/tools/beam-calculator", source: "src/pages/tools/BeamCalculatorPage.tsx" },
    { path: "/about", source: "src/pages/About/AboutPage.tsx" },
    { path: "/contact", source: "src/pages/Contact/ContactPage.tsx" },
  ];

  const check = <T,>(label: string, res: { data: T[] | null; error: unknown }): T[] => {
    if (res.error) throw new Error(`prerender: couldn't list ${label}: ${JSON.stringify(res.error)}`);
    return res.data ?? [];
  };

  const [courses, categories, posts, resources, software, topics, cards] = await Promise.all([
    supabase.from("courses").select("slug, updated_at").eq("is_published", true),
    supabase.from("categories").select("slug").eq("is_active", true),
    supabase.from("blog_posts").select("slug, updated_at").eq("is_published", true),
    supabase.from("resources").select("slug, updated_at").eq("status", "published"),
    supabase.from("software").select("slug"),
    supabase.from("topics").select("slug"),
    supabase.from("resource_cards").select("type, software, topics"),
  ]);

  const counts = new Map<string, number>();
  const bump = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
  for (const card of check("resource cards", cards) as {
    type: string;
    software: { slug: string }[];
    topics: { slug: string }[];
  }[]) {
    bump(`/resources/type/${card.type}`);
    for (const sw of card.software ?? []) bump(`/resources/software/${sw.slug}`);
    for (const t of card.topics ?? []) bump(`/resources/topic/${t.slug}`);
  }
  const thin = (path: string) => (counts.get(path) ?? 0) < MIN_RESOURCES_TO_INDEX;

  const badSlugs: string[] = [];
  const add = (prefix: string, rows: { slug: string; updated_at?: string }[]) => {
    for (const row of rows) {
      if (!CANONICAL_SLUG.test(row.slug)) {
        badSlugs.push(`${prefix}${row.slug}`);
        continue;
      }
      const path = `${prefix}${row.slug}`;
      const listing = /^\/resources\/(software|topic)\//.test(path);
      routes.push({ path, lastmod: row.updated_at, thin: listing && thin(path) });
    }
  };

  add("/courses/", check("courses", courses));
  add("/courses/category/", check("categories", categories));
  add("/blog/", check("blog posts", posts));
  add("/resources/", check("resources", resources));
  add("/resources/software/", check("software", software));
  add("/resources/topic/", check("topics", topics));
  for (const type of RESOURCE_TYPES) {
    const path = `/resources/type/${type}`;
    routes.push({ path, thin: thin(path) });
  }

  return { routes, badSlugs };
}
