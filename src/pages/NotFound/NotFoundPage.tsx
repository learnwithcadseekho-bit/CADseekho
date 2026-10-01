import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { setSsrStatus } from "@/lib/httpStatus";
import { legacyRedirect } from "@/content/legacyRedirects";

export default function NotFoundPage() {
  setSsrStatus(404);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // The host 301s old URLs (vercel.json / .htaccess); this only catches one
  // that slipped through, e.g. an unusual encoding of a space.
  useEffect(() => {
    const target = legacyRedirect(pathname);
    if (target) navigate(target, { replace: true });
  }, [pathname, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-4)",
        textAlign: "center",
        padding: "var(--space-8)",
      }}
    >
      <Seo title="Page not found" noindex />
      <span className="mono-label">ERROR — 404</span>
      <h1 style={{ fontSize: "2rem" }}>Page not found</h1>
      <p style={{ maxWidth: 420 }}>The page you're looking for doesn't exist or may have moved.</p>
      <p style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap", justifyContent: "center" }}>
        <Link to="/" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Back to home
        </Link>
        <Link to="/courses" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Browse courses
        </Link>
        <Link to="/blog" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Read the blog
        </Link>
      </p>
    </div>
  );
}
