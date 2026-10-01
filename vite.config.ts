import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  ssr: {
    // CommonJS-only packages Node can't import by name — bundle them into the renderer.
    noExternal: ["react-helmet-async"],
  },
  build: isSsrBuild
    ? {
        // `vite build --ssr src/entry-server.tsx` — the build-time prerender's
        // renderer, run by scripts/prerender.mjs and never deployed.
        outDir: "dist-ssr",
        emptyOutDir: true,
      }
    : {
        // The prerender reads this to link each page's route-chunk CSS/JS.
        manifest: true,
        rollupOptions: {
          output: {
            // Keep rarely-changing vendor code in its own long-cached chunks and
            // let it download in parallel with the app shell instead of as one
            // 400KB entry chunk.
            manualChunks: {
              "react-vendor": ["react", "react-dom", "react-router-dom"],
              "supabase-vendor": ["@supabase/supabase-js"],
            },
          },
        },
      },
}));
