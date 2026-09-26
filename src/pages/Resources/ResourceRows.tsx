import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ResourceCard } from "@/components/ui/ResourceCard";
import { getLearningPaths, getMostUsedResources } from "@/services/resourceService";
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_PLURALS,
  type LearningPathWithItems,
  type ResourceCard as ResourceCardData,
  type Software,
  type Topic,
} from "@/types/resource";

export function LearningPathTiles({
  softwareId,
  title = "Start here",
}: {
  softwareId: string | null;
  title?: string;
}) {
  const [paths, setPaths] = useState<LearningPathWithItems[]>([]);

  useEffect(() => {
    getLearningPaths(softwareId).then(setPaths).catch(() => setPaths([]));
  }, [softwareId]);

  if (paths.length === 0) return null;

  return (
    <section className="resource-row" aria-labelledby="start-here-title">
      <h2 id="start-here-title" className="resource-row__title">
        {title}
      </h2>
      <div className="path-grid">
        {paths.map((p) => (
          <div key={p.id} className="path-tile">
            {p.software && <span className="mono-label">{p.software.name}</span>}
            <h3 className="path-tile__title">{p.title}</h3>
            {p.description && <p className="path-tile__desc">{p.description}</p>}
            <ol className="path-tile__steps">
              {p.items.map((r) => (
                <li key={r.id}>
                  <Link to={`/resources/${r.slug}`}>{r.title}</Link>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MostUsedRow({ softwareSlug }: { softwareSlug: string | null }) {
  const [items, setItems] = useState<ResourceCardData[]>([]);

  useEffect(() => {
    getMostUsedResources(softwareSlug).then(setItems).catch(() => setItems([]));
  }, [softwareSlug]);

  if (items.length === 0) return null;

  return (
    <section className="resource-row" aria-labelledby="most-used-title">
      <h2 id="most-used-title" className="resource-row__title">
        Most used this month
      </h2>
      <div className="resource-strip">
        {items.map((r) => (
          <ResourceCard key={r.id} resource={r} />
        ))}
      </div>
    </section>
  );
}

/** Crawlable links to every software/topic/type landing page. */
export function TaxonomyIndex({ software, topics }: { software: Software[]; topics: Topic[] }) {
  return (
    <nav className="taxonomy-index container" aria-label="Browse resources">
      <div>
        <h2 className="mono-label">By software</h2>
        <ul>
          {software.map((s) => (
            <li key={s.slug}>
              <Link to={`/resources/software/${s.slug}`}>{s.name}</Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="mono-label">By topic</h2>
        <ul>
          {topics.map((t) => (
            <li key={t.slug}>
              <Link to={`/resources/topic/${t.slug}`}>{t.name}</Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="mono-label">By type</h2>
        <ul>
          {RESOURCE_TYPES.map((t) => (
            <li key={t}>
              <Link to={`/resources/type/${t}`}>{RESOURCE_TYPE_PLURALS[t]}</Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
