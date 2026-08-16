import { Link } from "react-router-dom";
import "@/styles/layout.css";

const COURSE_CATEGORY_LINKS = [
  { label: "AutoCAD", to: "/courses/category/autocad" },
  { label: "SolidWorks", to: "/courses/category/solidworks" },
  { label: "ANSYS", to: "/courses/category/ansys" },
  { label: "Creo", to: "/courses/category/creo" },
];

// Placeholders only — Section 25 explicitly says not to invent social URLs.
const SOCIAL_LINKS = [
  { label: "Facebook", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "YouTube", href: "#" },
  { label: "LinkedIn", href: "#" },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__col">
          <span className="site-footer__brand">CADseekho</span>
          <p className="site-footer__blurb">
            Practical CAD and engineering training for students, engineers, designers, and working
            professionals.
          </p>
        </div>

        <div className="site-footer__col">
          <span className="mono-label">Courses</span>
          <ul>
            {COURSE_CATEGORY_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer__col">
          <span className="mono-label">Resources</span>
          <ul>
            <li>
              <Link to="/downloads">Free Downloads</Link>
            </li>
            <li>
              <Link to="/blog">Blog</Link>
            </li>
          </ul>
        </div>

        <div className="site-footer__col">
          <span className="mono-label">Company</span>
          <ul>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </div>

        <div className="site-footer__col">
          <span className="mono-label">Social</span>
          <ul>
            {SOCIAL_LINKS.map((link) => (
              <li key={link.label}>
                <a href={link.href} aria-disabled="true" title="Coming soon">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>© CADseekho. All rights reserved.</span>
      </div>
    </footer>
  );
}
