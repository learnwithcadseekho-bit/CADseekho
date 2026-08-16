import { Link } from "react-router-dom";

export default function NotFoundPage() {
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
      <span className="mono-label">ERROR — 404</span>
      <h1 style={{ fontSize: "2rem" }}>Page not found</h1>
      <p style={{ maxWidth: 420 }}>The page you're looking for doesn't exist or may have moved.</p>
      <Link to="/" style={{ color: "var(--accent)", fontWeight: 600 }}>
        Back to home
      </Link>
    </div>
  );
}
