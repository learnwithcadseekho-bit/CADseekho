// Local preview of the production build with the same routing as Vercel
// (vercel.json): redirects, trailingSlash: false, the app-shell rewrites,
// directory index.html, and a real 404 status with dist/404.html.
// `vite preview` can't stand in here: it answers every unknown URL with the
// home page and a 200, which hides exactly what SEO depends on.
//
//   npm run preview            → http://localhost:4173
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { createGzip } from "node:zlib";

const DIST = path.resolve("dist");
const PORT = Number(process.env.PORT || 4173);
const config = JSON.parse(readFileSync("vercel.json", "utf-8"));

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".glb": "model/gltf-binary",
};

// Vercel source patterns used in vercel.json: literal paths, "(a|b)" groups and ":path*".
function toRegex(source) {
  const pattern = source
    .replace(/[.+?^${}[\]\\]/g, "\\$&")
    .replace(/\/:path\*/g, "(?:/.*)?");
  return new RegExp(`^${pattern}$`);
}
const redirects = (config.redirects ?? []).map((r) => ({ ...r, re: toRegex(r.source) }));
const rewrites = (config.rewrites ?? []).map((r) => ({ ...r, re: toRegex(r.source) }));

function fileFor(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const direct = path.join(DIST, decoded);
  if (!direct.startsWith(DIST)) return null;
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  const index = path.join(direct, "index.html");
  if (existsSync(index)) return index;
  return null;
}

// Gzip text responses like Vercel does, so Lighthouse numbers are realistic.
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".xml", ".txt", ".svg"]);

function send(req, res, status, file) {
  const type = TYPES[path.extname(file)] ?? "application/octet-stream";
  const gzip = COMPRESSIBLE.has(path.extname(file)) && /gzip/.test(req.headers["accept-encoding"] ?? "");
  const cache = file.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache";
  res.writeHead(status, { "Content-Type": type, "Cache-Control": cache, ...(gzip && { "Content-Encoding": "gzip" }) });
  const stream = createReadStream(file);
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
}

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const rawPath = url.pathname; // percent-encoded, as Vercel matches it

  for (const r of redirects) {
    if (r.re.test(rawPath)) {
      res.writeHead(r.statusCode ?? 308, { Location: r.destination + url.search });
      return res.end();
    }
  }
  if (config.trailingSlash === false && rawPath.length > 1 && rawPath.endsWith("/")) {
    res.writeHead(308, { Location: rawPath.replace(/\/+$/, "") + url.search });
    return res.end();
  }

  const file = fileFor(rawPath);
  if (file) return send(req, res, 200, file);

  for (const r of rewrites) {
    if (r.re.test(rawPath)) return send(req, res, 200, path.join(DIST, r.destination));
  }

  send(req, res, 404, path.join(DIST, "404.html"));
}).listen(PORT, () => console.log(`dist/ with Vercel routing on http://localhost:${PORT}`));
