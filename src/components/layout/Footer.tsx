import { Link } from "react-router-dom";
import { BUSINESS, socialLinks } from "@/config/site";
import { AREA_LINK_LABELS, AREA_PATHS, type AreaKey } from "@/content/localAreas";
import "@/styles/layout.css";

const COURSE_CATEGORY_LINKS = [
  { label: "ANSYS", to: "/courses/category/ansys" },
  { label: "SolidWorks", to: "/courses/category/solidworks" },
  { label: "Creo", to: "/courses/category/creo" },
  { label: "AutoCAD", to: "/courses/category/autocad" },
];

const LOCAL_KEYS: AreaKey[] = ["delhi-ncr", "delhi", "noida", "gurgaon", "ghaziabad"];

// Footer cities line — the NCR service area, in one fixed order.
const SERVING = ["Delhi", "Noida", "Gurugram", "Ghaziabad", "Faridabad", "Meerut"];

export function Footer() {
  const social = socialLinks();
  const address = BUSINESS.address;

  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__col">
          <span className="site-footer__brand">{BUSINESS.name}</span>
          <p className="site-footer__blurb">
            ANSYS, FEA and CAD training for students, engineers and working professionals — live online and
            classroom batches in Delhi NCR.
          </p>
          {/* NAP: keep this exact format everywhere (Google Business Profile included). */}
          <address className="site-footer__contact">
            <span>{BUSINESS.name}</span>
            {address && (
              <span>
                {address.street}, {address.locality}, {address.region} {address.postalCode}
              </span>
            )}
            <a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>
            <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
          </address>
        </div>

        <div className="site-footer__col">
          <span className="mono-label">Courses</span>
          <ul>
            {COURSE_CATEGORY_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
            <li>
              <Link to="/courses">All courses</Link>
            </li>
          </ul>
        </div>

        <div className="site-footer__col">
          <span className="mono-label">Delhi NCR</span>
          <ul>
            {LOCAL_KEYS.map((key) => (
              <li key={key}>
                <Link to={AREA_PATHS[key]}>{AREA_LINK_LABELS[key]}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer__col">
          <span className="mono-label">Resources</span>
          <ul>
            <li>
              <Link to="/resources">Calculators &amp; Tutorials</Link>
            </li>
            <li>
              <Link to="/tools/beam-calculator">Beam Calculator</Link>
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
            {social.map((link) => (
              <li key={link.label}>
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>Serving {SERVING.join(" · ")}</span>
        <span>© {BUSINESS.name}. All rights reserved.</span>
      </div>
    </footer>
  );
}
