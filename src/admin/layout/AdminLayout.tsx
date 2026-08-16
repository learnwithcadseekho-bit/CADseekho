import { NavLink, Outlet } from "react-router-dom";
import "./admin-layout.css";

const ADMIN_NAV = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/courses", label: "Courses" },
  { to: "/admin/downloads", label: "Downloads" },
  { to: "/admin/blog", label: "Blog" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/messages", label: "Messages" },
];

export function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <span className="admin-sidebar__brand">CADseekho Admin</span>
        <nav>
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-sidebar__link ${isActive ? "admin-sidebar__link--active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/" className="admin-sidebar__link admin-sidebar__back">
          ← Back to site
        </NavLink>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
