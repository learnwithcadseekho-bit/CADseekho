import { Link } from "react-router-dom";
import {
  RESOURCE_ACCESS_LABELS,
  RESOURCE_LEVEL_LABELS,
  RESOURCE_TYPE_LABELS,
  type ResourceAccess,
  type ResourceCard as ResourceCardData,
} from "@/types/resource";
import "@/styles/drafting.css";
import "@/styles/resources.css";

function LockIcon() {
  return (
    <svg className="access-badge__lock" viewBox="0 0 12 14" width="10" height="12" aria-hidden="true">
      <rect x="1" y="6" width="10" height="7" rx="1" fill="currentColor" />
      <path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function AccessBadge({ access }: { access: ResourceAccess }) {
  return (
    <span className={`access-badge access-badge--${access}`}>
      {access === "paid" && <LockIcon />}
      {RESOURCE_ACCESS_LABELS[access]}
    </span>
  );
}

export function ResourceCard({ resource }: { resource: ResourceCardData }) {
  return (
    <article className="resource-card drafting-frame drafting-frame--interactive">
      {resource.thumbnail_url && (
        <div className="resource-card__thumb">
          <img src={resource.thumbnail_url} alt="" loading="lazy" decoding="async" />
        </div>
      )}
      <div className="resource-card__top">
        <span className="mono-label">{RESOURCE_TYPE_LABELS[resource.type]}</span>
        <AccessBadge access={resource.access} />
      </div>
      <h3 className="resource-card__title">
        {/* The stretched link makes the whole card clickable while keeping one
            accessible link name — the title. */}
        <Link to={`/resources/${resource.slug}`} className="resource-card__link">
          {resource.title}
        </Link>
      </h3>
      {resource.summary && <p className="resource-card__summary">{resource.summary}</p>}
      <div className="resource-card__footer">
        <ul className="resource-card__software" aria-label="Software">
          {resource.software.map((s) => (
            <li key={s.slug} className="software-tag" title={s.name}>
              {s.short_name}
            </li>
          ))}
        </ul>
        <span className="mono-label">{RESOURCE_LEVEL_LABELS[resource.level]}</span>
      </div>
    </article>
  );
}
