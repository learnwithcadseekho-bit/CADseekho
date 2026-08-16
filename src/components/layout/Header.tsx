import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { CoursesMegaMenu } from "./CoursesMegaMenu";
import { MobileMenu } from "./MobileMenu";
import { NAV_LINKS } from "./navLinks";
import "@/styles/layout.css";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `site-header__link ${isActive ? "site-header__link--active" : ""}`;
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close the mobile drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-header__logo">
          CADseekho
        </Link>

        <nav className="site-header__nav" aria-label="Primary">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <CoursesMegaMenu />
          {NAV_LINKS.filter((l) => l.to !== "/").map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__actions">
          {session ? (
            <>
              {profile?.role === "admin" && (
                <Link to="/admin" className="site-header__link">
                  Admin
                </Link>
              )}
              <Link to="/dashboard" className="site-header__link">
                Dashboard
              </Link>
              <button type="button" className="btn btn--outline" onClick={handleSignOut}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="site-header__link">
                Login
              </Link>
              <Link to="/signup" className="btn btn--primary">
                Sign Up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="site-header__hamburger"
          aria-expanded={mobileOpen}
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
