import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TOOL_LINKS } from "./navLinks";

// Tools dropdown — same look and behaviour as CoursesMegaMenu.
export function ToolsMenu() {
  const [open, setOpen] = useState(false);
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
        Tools
        <span className={`mega-menu__caret ${open ? "mega-menu__caret--open" : ""}`} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="mega-menu__panel mega-menu__panel--wide" role="menu">
          {TOOL_LINKS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="mega-menu__item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className="mega-menu__item-name">{tool.label}</span>
              <span className="mega-menu__item-count mono-label">{tool.kind}</span>
            </Link>
          ))}
          <Link to="/resources" className="mega-menu__all" role="menuitem" onClick={() => setOpen(false)}>
            All resources →
          </Link>
        </div>
      )}
    </div>
  );
}
