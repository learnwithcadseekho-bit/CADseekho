import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { RichContent } from "@/components/RichContent";
import { LockedPanel } from "@/components/LockedPanel";
import { AccessBadge, ResourceCard } from "@/components/ui/ResourceCard";
import { RESOURCE_COMPONENTS } from "@/calculators/registry";
import { useAuth } from "@/hooks/useAuth";
import {
  getResourceBySlug,
  getResourcePremium,
  getSoftwareList,
  logResourceEvent,
} from "@/services/resourceService";
import {
  RESOURCE_LEVEL_LABELS,
  RESOURCE_RELATION_LABELS,
  RESOURCE_TYPE_LABELS,
  SIMULATION_SOFTWARE,
  type RelatedResource,
  type ResourceDetail,
  type ResourceRelation,
  type Software,
} from "@/types/resource";
import NotFoundPage from "@/pages/NotFound/NotFoundPage";
import "@/styles/cards.css";
import "@/styles/resources.css";

type LoadState = "loading" | "not-found" | "error" | "ready";

const CALCULATE_EVENT_INTERVAL_MS = 30_000;

export default function ResourceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  // undefined = still checking; null = locked for this viewer.
  const [premium, setPremium] = useState<Record<string, unknown> | null | undefined>(undefined);
  const lastCalculateLog = useRef(0);

  useEffect(() => {
    if (!slug) return;
    setState("loading");
    getResourceBySlug(slug)
      .then((r) => {
        if (!r) {
          setState("not-found");
          return;
        }
        setResource(r);
        setState("ready");
      })
      .catch(() => setState("error"));
    getSoftwareList().then(setSoftwareList).catch(() => {});
  }, [slug]);

  const resourceId = resource?.id;
  const access = resource?.access;

  // One view per page load, once auth has settled so it carries the user id.
  useEffect(() => {
    if (!resourceId || authLoading) return;
    logResourceEvent(resourceId, "view", user?.id ?? null);
  }, [resourceId, authLoading, user?.id]);

  // Re-checked when the user logs in/out, since RLS decides per user.
  useEffect(() => {
    if (!resourceId || authLoading) return;
    if (access === "free") {
      setPremium(null);
      return;
    }
    setPremium(undefined);
    getResourcePremium(resourceId)
      .then(setPremium)
      .catch(() => setPremium(null));
  }, [resourceId, access, authLoading, user?.id]);

  const onCalculate = useCallback(() => {
    if (!resourceId) return;
    const now = Date.now();
    if (now - lastCalculateLog.current < CALCULATE_EVENT_INTERVAL_MS) return;
    lastCalculateLog.current = now;
    logResourceEvent(resourceId, "calculate", user?.id ?? null);
  }, [resourceId, user?.id]);

  if (state === "loading") return <p className="section__status">Loading…</p>;
  if (state === "not-found") return <NotFoundPage />;
  if (state === "error") {
    return <p className="section__status">Something went wrong loading this resource. Please try again later.</p>;
  }

  const r = resource!;
  const entry = r.component_key ? RESOURCE_COMPONENTS[r.component_key] : undefined;
  const Interactive = entry?.component;
  const premiumHtml = typeof premium?.html === "string" ? premium.html : null;

  const sameTopic = r.related.filter((x) => x.relation === "same_topic_other_software");
  // The hand calc ↔ software chain only makes sense when simulation is on
  // one side of it; otherwise same-topic links show as ordinary related cards.
  const isSimulation = (item: { software: { slug: string }[] }) =>
    item.software.some((s) => SIMULATION_SOFTWARE.includes(s.slug));
  const showHandCalc = sameTopic.length > 0 && (isSimulation(r) || sameTopic.some(isSimulation));
  const relatedGroups = groupRelated(showHandCalc ? r.related.filter((x) => x.relation !== "same_topic_other_software") : r.related);

  const cta = r.course_cta ?? defaultCta(r, softwareList);

  return (
    <article className="resource-page">
      <Seo
        title={r.title}
        description={r.summary || undefined}
        image={r.thumbnail_url ?? undefined}
        type="article"
      />

      {r.status === "draft" && (
        <div className="draft-banner">
          <div className="container">Draft preview — only admins can see this page until it's published.</div>
        </div>
      )}

      {/* 1. Title, tags, access */}
      <header className="resource-page__header container">
        <nav className="resources-breadcrumb mono-label" aria-label="Breadcrumb">
          <Link to="/resources">Resources</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/resources/type/${r.type}`}>{RESOURCE_TYPE_LABELS[r.type]}</Link>
        </nav>
        <h1 className="resource-page__title">{r.title}</h1>
        <div className="resource-page__tags">
          <AccessBadge access={r.access} />
          <span className="mono-label">{RESOURCE_LEVEL_LABELS[r.level]}</span>
          {r.software.map((s) => (
            <Link key={s.slug} to={`/resources/software/${s.slug}`} className="software-tag" title={s.name}>
              {s.short_name}
            </Link>
          ))}
          {r.topics.map((t) => (
            <Link key={t.slug} to={`/resources/topic/${t.slug}`} className="topic-tag">
              {t.name}
            </Link>
          ))}
        </div>
      </header>

      <div className="container">
        {/* 2. What you'll get */}
        {r.summary && (
          <section className="resource-page__section">
            <h2 className="resource-page__section-title">What you'll get</h2>
            <p className="resource-page__summary">{r.summary}</p>
          </section>
        )}

        {/* 3. Content: free body, interactive component, locked part */}
        <section className="resource-page__section" aria-label="Content">
          {r.body && <RichContent content={r.body} className="rich-content" />}

          {Interactive && (
            <div style={{ marginTop: r.body ? "var(--space-8)" : 0 }}>
              <Suspense fallback={<p className="section__status">Loading the calculator…</p>}>
                <Interactive
                  resourceId={r.id}
                  config={r.component_props}
                  premium={premium ?? null}
                  onCalculate={onCalculate}
                />
              </Suspense>
            </div>
          )}

          {r.access !== "free" && premiumHtml && (
            <div style={{ marginTop: "var(--space-8)" }}>
              <RichContent content={premiumHtml} className="rich-content" />
            </div>
          )}

          {/* Interactive components lock their own sections; plain resources get one panel. */}
          {r.access !== "free" && premium === null && !Interactive && (
            <div style={{ marginTop: "var(--space-8)" }}>
              <LockedPanel resourceId={r.id} />
            </div>
          )}
        </section>

        {/* 4. Hand calc ↔ software */}
        {showHandCalc && (
          <section className="resource-page__section">
            <h2 className="resource-page__section-title">Hand calc ↔ software</h2>
            <p style={{ marginBottom: "var(--space-4)" }}>
              Solve it by hand first, then validate the same problem in software.
            </p>
            <ol className="handcalc-chain">
              <li className="handcalc-chain__item handcalc-chain__item--current">
                <SoftwareTags item={r} />
                <span>
                  <strong>{r.title}</strong> <span className="mono-label">(this page)</span>
                </span>
              </li>
              {sameTopic.map((x) => (
                <li key={x.id} className="handcalc-chain__item">
                  <SoftwareTags item={x} />
                  <Link to={`/resources/${x.slug}`}>{x.title}</Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* 5. Related, grouped by relation */}
        {relatedGroups.length > 0 && (
          <section className="resource-page__section resource-page__section--wide">
            <h2 className="resource-page__section-title">Related resources</h2>
            {relatedGroups.map(([relation, items]) => (
              <div key={relation} className="related-group">
                <h3 className="related-group__title mono-label">{RESOURCE_RELATION_LABELS[relation]}</h3>
                <div className="resource-grid">
                  {items.map((x) => (
                    <ResourceCard key={x.id} resource={x} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* 6. Course CTA */}
        <aside className="resource-cta">
          <h2>Learn this properly</h2>
          <p>Go from one-off answers to real, job-ready skill with a structured CADseekho course.</p>
          <Link to={cta.url} className="btn btn--primary">
            {cta.label}
          </Link>
        </aside>
      </div>
    </article>
  );
}

function SoftwareTags({ item }: { item: { software: { slug: string; name: string; short_name: string }[] } }) {
  return (
    <span className="resource-card__software">
      {item.software.map((s) => (
        <span key={s.slug} className="software-tag" title={s.name}>
          {s.short_name}
        </span>
      ))}
    </span>
  );
}

const RELATION_ORDER: ResourceRelation[] = ["prerequisite", "next_level", "same_topic_other_software"];

function groupRelated(items: RelatedResource[]): [ResourceRelation, RelatedResource[]][] {
  return RELATION_ORDER.map((rel) => [rel, items.filter((x) => x.relation === rel)] as [ResourceRelation, RelatedResource[]]).filter(
    ([, list]) => list.length > 0
  );
}

function defaultCta(r: ResourceDetail, softwareList: Software[]) {
  const tool = softwareList.find((s) => s.course_url && r.software.some((rs) => rs.slug === s.slug));
  return tool?.course_url
    ? { label: `Explore ${tool.name} courses →`, url: tool.course_url }
    : { label: "Browse all courses →", url: "/courses" };
}
