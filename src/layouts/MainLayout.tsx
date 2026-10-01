import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { jsonLdString } from "@/components/Seo";
import { organizationSchema } from "@/lib/schema";

// Suspense sits here (not around the whole route tree) so Header/Footer
// paint immediately while the routed page's lazy-loaded chunk downloads.
function PageLoading() {
  return (
    <section className="section container" aria-busy="true">
      <p className="section__status">Loading…</p>
    </section>
  );
}

export function MainLayout() {
  return (
    <>
      {/* Site-wide organization schema (NAP, service areas) on every public page. */}
      <Helmet>
        <script type="application/ld+json">{jsonLdString(organizationSchema())}</script>
      </Helmet>
      <Header />
      <main>
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
