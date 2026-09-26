import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/admin/resources", label: "All resources", end: true },
  { to: "/admin/resources/taxonomy", label: "Software, topics & synonyms" },
  { to: "/admin/resources/paths", label: "Learning paths" },
  { to: "/admin/resources/access", label: "Access grants" },
];

export function ResourcesAdminTabs() {
  return (
    <nav className="admin-tabs" aria-label="Resources admin">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => `admin-tabs__link ${isActive ? "admin-tabs__link--active" : ""}`}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
