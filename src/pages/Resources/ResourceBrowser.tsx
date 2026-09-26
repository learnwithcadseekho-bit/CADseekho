import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ResourceCard } from "@/components/ui/ResourceCard";
import { searchResources, type ResourceFilters } from "@/services/resourceService";
import {
  RESOURCE_ACCESSES,
  RESOURCE_ACCESS_LABELS,
  RESOURCE_LEVELS,
  RESOURCE_LEVEL_LABELS,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  type ResourceCard as ResourceCardData,
  type Software,
  type Topic,
} from "@/types/resource";

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

type Dimension = "software" | "topic" | "type" | "level" | "access";

// URL param → filter field. Params are comma-separated, e.g.
// ?software=ansys,solidworks&topic=meshing&level=beginner&access=free
const DIMENSIONS: { param: Dimension; key: Exclude<keyof ResourceFilters, "q">; label: string }[] = [
  { param: "software", key: "software", label: "Software" },
  { param: "topic", key: "topics", label: "Topic" },
  { param: "type", key: "types", label: "Type" },
  { param: "level", key: "levels", label: "Level" },
  { param: "access", key: "access", label: "Access" },
];

function readList(params: URLSearchParams, name: string): string[] {
  return (params.get(name) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

interface ResourceBrowserProps {
  software: Software[];
  topics: Topic[];
  /** Filters fixed by the page (e.g. the software landing page) — applied but not shown as chips. */
  fixed?: Partial<Record<Dimension, string>>;
  searchLabel?: string;
  searchPlaceholder?: string;
  /** Rendered between the filters and the results only while nothing is searched or filtered. */
  idleContent?: ReactNode;
}

export function ResourceBrowser({
  software,
  topics,
  fixed = {},
  searchLabel = "Search resources",
  searchPlaceholder = "Try “scf”, “buckling”, “sheet metal”…",
  idleContent,
}: ResourceBrowserProps) {
  const [params, setParams] = useSearchParams();
  const panelId = useId();
  const searchId = useId();

  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [filtersOpen, setFiltersOpen] = useState(() => window.matchMedia("(min-width: 900px)").matches);

  const [items, setItems] = useState<ResourceCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  // Back/forward navigation changes the URL under us — mirror it into the box.
  useEffect(() => setQuery(urlQuery), [urlQuery]);

  // Debounced search-as-you-type. replace: true so each keystroke doesn't
  // become its own history entry.
  useEffect(() => {
    if (query === urlQuery) return;
    const t = window.setTimeout(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (query.trim()) next.set("q", query);
          else next.delete("q");
          return next;
        },
        { replace: true }
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query, urlQuery, setParams]);

  const selected = useMemo(() => {
    const out = {} as Record<Dimension, string[]>;
    for (const d of DIMENSIONS) out[d.param] = readList(params, d.param);
    return out;
  }, [params]);

  const filters: ResourceFilters = useMemo(() => {
    const f: ResourceFilters = { q: urlQuery, software: [], topics: [], types: [], levels: [], access: [] };
    for (const d of DIMENSIONS) {
      f[d.key] = fixed[d.param] ? [fixed[d.param]!] : selected[d.param];
    }
    return f;
    // fixed is an inline object literal from the caller; compare by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery, selected, JSON.stringify(fixed)]);

  useEffect(() => {
    const id = ++requestId.current;
    setStatus("loading");
    searchResources(filters, PAGE_SIZE, 0)
      .then((res) => {
        if (id !== requestId.current) return;
        setItems(res.items);
        setTotal(res.total);
        setStatus("ready");
      })
      .catch(() => id === requestId.current && setStatus("error"));
  }, [filters]);

  async function loadMore() {
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const res = await searchResources(filters, PAGE_SIZE, items.length);
      if (id !== requestId.current) return;
      setItems((prev) => [...prev, ...res.items]);
      setTotal(res.total);
    } catch {
      setStatus("error");
    } finally {
      setLoadingMore(false);
    }
  }

  function toggle(dim: Dimension, value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      const current = readList(prev, dim);
      const list = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      if (list.length > 0) next.set(dim, list.join(","));
      else next.delete(dim);
      return next;
    });
  }

  function clearAll() {
    setQuery("");
    setParams(new URLSearchParams());
  }

  // Topic chips on a software page only list topics that apply to that tool.
  const topicOptions = fixed.software ? topics.filter((t) => t.software.includes(fixed.software!)) : topics;

  const options: Record<Dimension, { value: string; label: string }[]> = {
    software: software.map((s) => ({ value: s.slug, label: s.name })),
    topic: topicOptions.map((t) => ({ value: t.slug, label: t.name })),
    type: RESOURCE_TYPES.map((t) => ({ value: t, label: RESOURCE_TYPE_LABELS[t] })),
    level: RESOURCE_LEVELS.map((l) => ({ value: l, label: RESOURCE_LEVEL_LABELS[l] })),
    access: RESOURCE_ACCESSES.map((a) => ({ value: a, label: RESOURCE_ACCESS_LABELS[a] })),
  };

  const visibleDimensions = DIMENSIONS.filter((d) => !fixed[d.param]);
  const activeChips = visibleDimensions.flatMap((d) =>
    selected[d.param].map((value) => ({
      dim: d.param,
      value,
      label: options[d.param].find((o) => o.value === value)?.label ?? value,
    }))
  );
  const isIdle = !urlQuery.trim() && activeChips.length === 0;

  return (
    <div className="resource-browser container">
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor={searchId} className="field__label">
          {searchLabel}
        </label>
        <div className="resource-search">
          <svg className="resource-search__icon" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.75" />
            <path d="M13 13l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          <input
            id={searchId}
            type="search"
            className="resource-search__input"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
      </form>

      <div className="resource-filters__bar">
        <button
          type="button"
          className="btn btn--outline btn--sm resource-filters__toggle"
          aria-expanded={filtersOpen}
          aria-controls={panelId}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          Filters{activeChips.length > 0 ? ` (${activeChips.length})` : ""}
          <span aria-hidden="true">{filtersOpen ? "▴" : "▾"}</span>
        </button>
        {activeChips.length > 0 && (
          <div className="active-filters">
            {activeChips.map((c) => (
              <button
                key={`${c.dim}:${c.value}`}
                type="button"
                className="active-filter"
                onClick={() => toggle(c.dim, c.value)}
                aria-label={`Remove filter: ${c.label}`}
              >
                {c.label}
                <span className="active-filter__x" aria-hidden="true">
                  ×
                </span>
              </button>
            ))}
            <button type="button" className="text-button" onClick={clearAll}>
              Clear all
            </button>
          </div>
        )}
      </div>

      <div id={panelId} className="resource-filters__panel" hidden={!filtersOpen}>
        {visibleDimensions.map((d) => (
          <fieldset key={d.param} className="filter-group">
            <legend className="filter-group__legend mono-label">{d.label}</legend>
            <div className="filter-group__chips">
              {options[d.param].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className="filter-chip"
                  aria-pressed={selected[d.param].includes(o.value)}
                  onClick={() => toggle(d.param, o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {isIdle && idleContent}

      <div className="resource-results__meta">
        <h2 className="resource-row__title" style={{ margin: 0 }}>
          {isIdle ? "All resources" : "Results"}
        </h2>
        <p className="mono-label" aria-live="polite">
          {status === "ready" && `${total} ${total === 1 ? "resource" : "resources"}`}
          {status === "loading" && "Searching…"}
        </p>
      </div>

      {status === "error" && (
        <p className="section__status">Resources couldn't be loaded. Please try again in a moment.</p>
      )}

      {status !== "error" && status === "ready" && items.length === 0 && (
        <div className="resource-empty">
          <p style={{ color: "var(--ink)", fontWeight: 600 }}>
            {isIdle ? "No resources are published here yet." : "Nothing matches that search."}
          </p>
          {!isIdle && (
            <p>
              Try a shorter word, check the spelling, or{" "}
              <button type="button" className="text-button" onClick={clearAll}>
                clear all filters
              </button>
              .
            </p>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div className="resource-grid" style={{ opacity: status === "loading" ? 0.5 : 1 }}>
          {items.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}

      {status === "ready" && items.length < total && (
        <div className="resource-results__more">
          <button type="button" className="btn btn--outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : `Show more (${total - items.length} left)`}
          </button>
        </div>
      )}
    </div>
  );
}
