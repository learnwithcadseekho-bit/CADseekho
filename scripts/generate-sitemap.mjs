// Runs after `vite build` (see package.json) to emit dist/sitemap.xml with
// both static routes and live published courses/categories/blog posts.
// Non-fatal by design: if Supabase env vars are missing or the fetch fails,
// it falls back to a static-only sitemap rather than breaking the build.
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const SITE_URL = (process.env.VITE_SITE_URL || "https://cadseekho.com").replace(/\/$/, "");
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const STATIC_PATHS = ["/", "/courses", "/downloads", "/blog", "/about", "/contact", "/login", "/signup"];

function urlEntry(path) {
  return `  <url><loc>${SITE_URL}${path}</loc></url>`;
}

async function main() {
  const entries = [...STATIC_PATHS.map(urlEntry)];

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const [{ data: courses }, { data: categories }, { data: posts }] = await Promise.all([
        supabase.from("courses").select("slug").eq("is_published", true),
        supabase.from("categories").select("slug").eq("is_active", true),
        supabase.from("blog_posts").select("slug").eq("is_published", true),
      ]);
      courses?.forEach((c) => entries.push(urlEntry(`/courses/${c.slug}`)));
      categories?.forEach((c) => entries.push(urlEntry(`/courses/category/${c.slug}`)));
      posts?.forEach((p) => entries.push(urlEntry(`/blog/${p.slug}`)));
    } catch (err) {
      console.warn("sitemap: couldn't fetch dynamic routes, generating static-only sitemap:", err.message);
    }
  } else {
    console.warn("sitemap: Supabase env vars not set, generating static-only sitemap.");
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
  writeFileSync("dist/sitemap.xml", xml, "utf-8");
  console.log(`sitemap: wrote dist/sitemap.xml with ${entries.length} URLs`);
}

main();
