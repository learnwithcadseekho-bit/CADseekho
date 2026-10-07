// Build-time prerender: writes real HTML for every public page.
//
// Runs after `vite build` (client → dist/) and `vite build --ssr` (renderer →
// dist-ssr/). For each public URL it renders the React app in Node, waits for
// all of the page's Supabase data, and writes dist/<path>/index.html with the
// page's own <title>, meta description, canonical, Open Graph tags, JSON-LD,
// its route CSS, and the data the browser needs to hydrate. Also writes
// dist/404.html, dist/app.html (the plain shell for client-only routes) and
// dist/sitemap.xml.
//
//   npm run build       full build (types, client, renderer, prerender)
//   npm run build:seo   prerender only, against the existing dist/ — run after
//                       publishing a blog post/course to regenerate its page
//                       and the sitemap without rebuilding the JS.
//
// Fails the build on anything that would ship a broken or misleading page:
// a data fetch error, a listed URL that renders as 404, a non-canonical slug,
// or invalid JSON-LD. Length/heading problems are reported as warnings.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// React's production server renderer (and production behaviour in the app).
process.env.NODE_ENV = "production";

const DIST = "dist";
const SSR_ENTRY = "dist-ssr/entry-server.js";
const SITE_URL = (process.env.VITE_SITE_URL || "https://cadseekho.com").replace(/\/$/, "");
const GSC_VERIFICATION = process.env.VITE_GSC_VERIFICATION || ""; // TODO(seo): set in .env / Vercel
const GA4_ID = process.env.VITE_GA4_ID || ""; // TODO(seo): set in .env / Vercel
// Numeric only, so a placeholder never ships. Same check as src/lib/metaPixel.ts.
const RAW_PIXEL_ID = (process.env.VITE_META_PIXEL_ID || "").trim();
const META_PIXEL_ID = /^\d+$/.test(RAW_PIXEL_ID) ? RAW_PIXEL_ID : "";

const warnings = [];
const warn = (msg) => warnings.push(msg);
const fail = (msg) => {
  console.error(`\nprerender: ${msg}\n`);
  process.exit(1);
};

if (!existsSync(SSR_ENTRY)) fail(`${SSR_ENTRY} not found — run \`vite build --ssr src/entry-server.tsx\` first.`);
const manifestPath = path.join(DIST, ".vite", "manifest.json");
if (!existsSync(manifestPath)) fail(`${manifestPath} not found — run \`vite build\` first.`);

// ---------------------------------------------------------------------------
// Template. A fresh `vite build` leaves the shell in dist/index.html; keep a
// pristine copy as dist/app.html (also served to client-only routes), so this
// script can be re-run after dist/index.html has been replaced by the home page.

const appShellPath = path.join(DIST, "app.html");
let template;
if (existsSync(appShellPath)) {
  template = readFileSync(appShellPath, "utf-8").replace(/\s*<meta name="robots"[^>]*>/, "");
} else {
  template = readFileSync(path.join(DIST, "index.html"), "utf-8");
}
if (!template.includes('<div id="root">')) fail("template has no <div id=\"root\"> — is dist/app.html stale?");

// Meta Pixel base code + first PageView. Public (prerendered) pages only —
// the client-only shell (login, dashboard, admin, classroom) never gets it.
// disablePushState: MetaPixelTracker sends one PageView per route change, so
// the pixel mustn't also send its own on history.pushState.
function metaPixel() {
  if (!META_PIXEL_ID) return "";
  return (
    `\n    <script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};` +
    `if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;` +
    `s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
    `fbq.disablePushState=true;fbq('init','${META_PIXEL_ID}');fbq('track','PageView');</script>` +
    `\n    <noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&amp;ev=PageView&amp;noscript=1" /></noscript>`
  );
}

function headExtras({ pixel = true } = {}) {
  let out = "";
  if (GSC_VERIFICATION) out += `\n    <meta name="google-site-verification" content="${GSC_VERIFICATION}" />`;
  if (GA4_ID) {
    out += `\n    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>`;
    out += `\n    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}');</script>`;
  }
  if (pixel) out += metaPixel();
  return out;
}

// Client-only routes (login, dashboard, admin…): the shell with noindex.
writeFileSync(
  appShellPath,
  template.replace("</head>", () => `    <meta name="robots" content="noindex" />${headExtras({ pixel: false })}\n  </head>`),
  "utf-8"
);

// ---------------------------------------------------------------------------
// Route assets from Vite's manifest: the CSS (and JS to preload) for the
// lazily loaded route modules each page rendered, minus what the entry
// chunk already loads.

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
if (!entryKey) fail("no entry in the Vite manifest");

function closure(key, seen = new Set()) {
  if (seen.has(key) || !manifest[key]) return seen;
  seen.add(key);
  for (const dep of manifest[key].imports ?? []) closure(dep, seen);
  return seen;
}
const entryChunks = closure(entryKey);
const entryCss = new Set([...entryChunks].flatMap((k) => manifest[k].css ?? []));

function routeAssets(moduleIds) {
  const css = new Set();
  const js = new Set();
  for (const id of moduleIds) {
    if (!manifest[id]) fail(`trackedLazy id "${id}" isn't a key in the Vite manifest — fix the id string.`);
    for (const key of closure(id)) {
      if (entryChunks.has(key)) continue;
      js.add(manifest[key].file);
      for (const file of manifest[key].css ?? []) if (!entryCss.has(file)) css.add(file);
    }
  }
  return [
    ...[...css].map((f) => `<link rel="stylesheet" crossorigin href="/${f}">`),
    ...[...js].map((f) => `<link rel="modulepreload" crossorigin href="/${f}">`),
  ].join("\n    ");
}

// ---------------------------------------------------------------------------

const { render, getPrerenderRoutes, SSR_DATA_ELEMENT_ID, LEGACY_REDIRECTS } = await import(
  pathToFileURL(path.resolve(SSR_ENTRY)).href
);

// Every legacy redirect must exist on every host we might deploy to.
for (const config of ["vercel.json", "public/.htaccess", "public/_redirects"]) {
  const text = readFileSync(config, "utf-8");
  for (const { from, to } of LEGACY_REDIRECTS) {
    if (!text.includes(to)) fail(`${config} is missing the 301 ${from} → ${to} (see src/content/legacyRedirects.ts)`);
  }
}

function buildPage(result, { thin = false } = {}) {
  const { helmet } = result;
  const head = [
    helmet.title.toString(),
    helmet.meta.toString(),
    helmet.link.toString(),
    helmet.script.toString(),
    routeAssets(result.modules),
    // Listing pages with almost nothing on them yet (see getPrerenderRoutes).
    thin && !/name="robots"/.test(helmet.meta.toString()) ? '<meta name="robots" content="noindex, follow" />' : "",
  ]
    .filter(Boolean)
    .join("\n    ");
  const data = JSON.stringify(result.data).replace(/</g, "\\u003c");

  // Replacer functions, not strings: page content may contain "$&"-style sequences.
  return template
    .replace(/<title>[\s\S]*?<\/title>/, () => "")
    .replace("</head>", () => `    ${head}${headExtras()}\n  </head>`)
    .replace(
      /<div id="root">[\s\S]*?<\/div>\s*(?=<\/body>|<script)/,
      () =>
        `<div id="root" data-prerendered>${result.html}</div>\n    <script id="${SSR_DATA_ELEMENT_ID}" type="application/json">${data}</script>\n  `
    );
}

function outputFile(urlPath) {
  return urlPath === "/" ? path.join(DIST, "index.html") : path.join(DIST, ...urlPath.split("/").filter(Boolean), "index.html");
}

function audit(urlPath, html) {
  const head = html.slice(0, html.indexOf("</head>"));
  const title = head.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] ?? "";
  const description = head.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/)?.[1] ?? "";
  const canonical = head.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/)?.[1] ?? "";
  const noindex = /<meta[^>]*name="robots"[^>]*content="noindex/.test(head);
  const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;

  if (!title) warn(`${urlPath}: no <title>`);
  if (decode(title).length > 60) warn(`${urlPath}: title is ${decode(title).length} chars (> 60): ${decode(title)}`);
  if (!noindex) {
    if (!description) warn(`${urlPath}: no meta description`);
    if (decode(description).length > 155) warn(`${urlPath}: description is ${decode(description).length} chars (> 155)`);
    if (h1s !== 1) warn(`${urlPath}: ${h1s} <h1> elements (expected exactly 1)`);
    const expected = urlPath === "/" ? `${SITE_URL}/` : `${SITE_URL}${urlPath}`;
    if (canonical !== expected) warn(`${urlPath}: canonical is "${canonical}", expected "${expected}"`);
  }

  for (const [, json] of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(json);
    } catch (err) {
      fail(`${urlPath}: invalid JSON-LD (${err.message})`);
    }
  }
  return { title: decode(title), noindex, h1s };
}

function gitLastmod(file) {
  if (!file) return undefined;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], { encoding: "utf-8" }).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------

const { routes, badSlugs } = await getPrerenderRoutes();
if (badSlugs.length > 0 && process.env.PRERENDER_SKIP_BAD_SLUGS === "1") {
  // Local testing only: skip those pages instead of failing. Never deploy this.
  warn(`skipped non-canonical slugs (PRERENDER_SKIP_BAD_SLUGS=1): ${badSlugs.join(", ")}`);
} else if (badSlugs.length > 0) {
  fail(
    `non-canonical slugs (must be lowercase-hyphenated):\n  ${badSlugs.join("\n  ")}\n` +
      "Apply supabase/migrations/20261001090000_canonical_slugs.sql (or fix them in the admin), then rebuild."
  );
}

const pages = [];
for (const route of routes) {
  const result = await render(route.path);
  if (result.errors.length > 0) fail(`${route.path}: data fetch failed for ${result.errors.join(", ")}`);
  if (result.status !== 200) fail(`${route.path}: rendered with status ${result.status} — it's listed as a public page`);
  const html = buildPage(result, { thin: route.thin });
  const file = outputFile(route.path);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, html, "utf-8");
  pages.push({ ...route, ...audit(route.path, html), file });
}

// Real 404 page, served by the host for unknown URLs (with a 404 status).
const notFound = await render("/__not-found__");
if (notFound.status !== 404) fail(`404 page rendered with status ${notFound.status}`);
writeFileSync(path.join(DIST, "404.html"), buildPage(notFound), "utf-8");

// Sitemap: only indexable, canonical, 200-status pages.
const indexable = pages.filter((p) => !p.noindex);
const today = new Date().toISOString();
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable
  .map((p) => {
    const loc = p.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${p.path}`;
    const lastmod = (p.lastmod || gitLastmod(p.source) || today).slice(0, 10);
    return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`;
  })
  .join("\n")}
</urlset>
`;
writeFileSync(path.join(DIST, "sitemap.xml"), sitemap, "utf-8");

console.log(`prerender: wrote ${pages.length} pages + 404.html + app.html; sitemap.xml has ${indexable.length} URLs`);
for (const p of pages) console.log(`  ${p.noindex ? "noindex " : "        "}${p.path}  —  ${p.title}`);
if (!GSC_VERIFICATION) warnings.push("VITE_GSC_VERIFICATION not set — no Search Console verification tag (TODO(seo))");
if (!GA4_ID) warnings.push("VITE_GA4_ID not set — GA4 not installed (TODO(seo))");
if (!META_PIXEL_ID)
  warnings.push(
    RAW_PIXEL_ID
      ? `VITE_META_PIXEL_ID "${RAW_PIXEL_ID}" isn't a numeric pixel ID — Meta Pixel not installed`
      : "VITE_META_PIXEL_ID not set — Meta Pixel not installed"
  );
if (warnings.length > 0) {
  console.warn(`\nprerender: ${warnings.length} warning(s):`);
  for (const w of warnings) console.warn(`  - ${w}`);
}
process.exit(0);
