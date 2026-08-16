import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useActiveCategories } from "@/hooks/useActiveCategories";

export function CoursesMegaMenu() {
  const [open, setOpen] = useState(false);
  const { categories, loading, error } = useActiveCategories(open);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="mega-menu" ref={containerRef}>
      <button
        type="button"
        className="mega-menu__trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        Courses
        <span className={`mega-menu__caret ${open ? "mega-menu__caret--open" : ""}`} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="mega-menu__panel" role="menu">
          {error && <p className="mega-menu__empty">Courses are temporarily unavailable.</p>}
          {!error && loading && <p className="mega-menu__empty">Loading…</p>}
          {!error && categories?.length === 0 && (
            <p className="mega-menu__empty">No course categories yet.</p>
          )}
          {!error &&
            categories?.map((cat) => (
              <Link
                key={cat.id}
                to={`/courses/category/${cat.slug}`}
                className="mega-menu__item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <span className="mega-menu__item-name">{cat.name}</span>
                <span className="mega-menu__item-count mono-label">
                  {cat.course_count > 0
                    ? `${cat.course_count} course${cat.course_count === 1 ? "" : "s"}`
                    : "Coming Soon"}
                </span>
              </Link>
            ))}
          <Link to="/courses" className="mega-menu__all" role="menuitem" onClick={() => setOpen(false)}>
            View all courses →
          </Link>
        </div>
      )}
    </div>
  );
}
