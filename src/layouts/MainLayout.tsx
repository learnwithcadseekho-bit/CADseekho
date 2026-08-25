import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

// Suspense sits here (not around the whole route tree) so Header/Footer
// paint immediately while the routed page's lazy-loaded chunk downloads.
function PageLoading() {
  return (
    <section className="section container">
      <p className="section__status">Loading…</p>
    </section>
  );
}

export function MainLayout() {
  return (
    <>
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
