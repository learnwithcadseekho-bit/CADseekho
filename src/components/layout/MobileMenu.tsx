import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useActiveCategories } from "@/hooks/useActiveCategories";
import { useAuth } from "@/hooks/useAuth";
import { NAV_LINKS } from "./navLinks";

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [coursesOpen, setCoursesOpen] = useState(false);
  const { categories, loading, error } = useActiveCategories(open && coursesOpen);
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  if (!open) return null;

  async function handleSignOut() {
    await signOut();
    onClose();
    navigate("/", { replace: true });
  }

  return (
    <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu">
      <nav className="mobile-menu__nav">
        <Link to="/" className="mobile-menu__link" onClick={onClose}>
          Home
        </Link>

        <button
          type="button"
          className="mobile-menu__link mobile-menu__accordion-trigger"
          aria-expanded={coursesOpen}
          onClick={() => setCoursesOpen((o) => !o)}
        >
          Courses
          <span aria-hidden>{coursesOpen ? "−" : "+"}</span>
        </button>
        {coursesOpen && (
          <div className="mobile-menu__submenu">
            {error && <p className="mega-menu__empty">Courses are temporarily unavailable.</p>}
            {!error && loading && <p className="mega-menu__empty">Loading…</p>}
            {!error &&
              categories?.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/courses/category/${cat.slug}`}
                  className="mobile-menu__sublink"
                  onClick={onClose}
                >
                  {cat.name}
                  <span className="mono-label">{cat.course_count > 0 ? cat.course_count : "Soon"}</span>
                </Link>
              ))}
          </div>
        )}

        {NAV_LINKS.filter((l) => l.to !== "/").map((link) => (
          <Link key={link.to} to={link.to} className="mobile-menu__link" onClick={onClose}>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mobile-menu__actions">
        {session ? (
          <>
            {profile?.role === "admin" && (
              <Link to="/admin" className="btn btn--outline btn--block" onClick={onClose}>
                Admin
              </Link>
            )}
            <Link to="/dashboard" className="btn btn--outline btn--block" onClick={onClose}>
              Dashboard
            </Link>
            <button type="button" className="btn btn--primary btn--block" onClick={handleSignOut}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn--outline btn--block" onClick={onClose}>
              Log In
            </Link>
            <Link to="/signup" className="btn btn--primary btn--block" onClick={onClose}>
              Sign Up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
