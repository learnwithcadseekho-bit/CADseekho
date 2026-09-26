import { supabase } from "@/lib/supabaseClient";
import { cached } from "@/lib/cache";
import type {
  LearningPathWithItems,
  RelatedResource,
  ResourceCard,
  ResourceDetail,
  ResourceRelation,
  Software,
  SoftwareRef,
  Topic,
} from "@/types/resource";

const CARD_COLUMNS =
  "id, slug, title, summary, type, level, access, component_key, thumbnail_url, published_at, software, topics";

export async function getSoftwareList(): Promise<Software[]> {
  return cached("resources:software", async () => {
    const { data, error } = await supabase.from("software").select("*").order("sort_order").order("name");
    if (error) throw error;
    return (data ?? []) as Software[];
  }, 5 * 60_000);
}

export async function getTopicList(): Promise<Topic[]> {
  return cached("resources:topics", async () => {
    const { data, error } = await supabase
      .from("topics")
      .select("*, topic_software(software:software(slug))")
      .order("sort_order")
      .order("name");
    if (error) throw error;
    return (data ?? []).map(({ topic_software, ...t }) => ({
      ...t,
      software: (topic_software as { software: { slug: string } | null }[])
        .map((ts) => ts.software?.slug)
        .filter((s): s is string => Boolean(s)),
    })) as Topic[];
  }, 5 * 60_000);
}

export interface ResourceFilters {
  q: string;
  software: string[];
  topics: string[];
  types: string[];
  levels: string[];
  access: string[];
}

export interface ResourceSearchResult {
  items: ResourceCard[];
  total: number;
}

export async function searchResources(
  filters: ResourceFilters,
  limit: number,
  offset: number
): Promise<ResourceSearchResult> {
  const orNull = (a: string[]) => (a.length > 0 ? a : null);
  const { data, error } = await supabase.rpc("search_resources", {
    p_q: filters.q.trim() || null,
    p_software: orNull(filters.software),
    p_topics: orNull(filters.topics),
    p_types: orNull(filters.types),
    p_levels: orNull(filters.levels),
    p_access: orNull(filters.access),
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  const rows = (data ?? []) as (ResourceCard & { total_count: number })[];
  return { items: rows, total: rows[0]?.total_count ?? 0 };
}

export async function getMostUsedResources(softwareSlug: string | null, limit = 8): Promise<ResourceCard[]> {
  return cached(`resources:most-used:${softwareSlug ?? "all"}`, async () => {
    const { data, error } = await supabase.rpc("most_used_resources", {
      p_software: softwareSlug,
      p_days: 30,
      p_limit: limit,
    });
    if (error) throw error;
    return (data ?? []) as ResourceCard[];
  });
}

async function getCardsByIds(ids: string[]): Promise<ResourceCard[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("resource_cards")
    .select(CARD_COLUMNS)
    .in("id", ids)
    .eq("status", "published");
  if (error) throw error;
  return (data ?? []) as ResourceCard[];
}

export async function getLearningPaths(softwareId: string | null): Promise<LearningPathWithItems[]> {
  return cached(`resources:paths:${softwareId ?? "all"}`, async () => {
    let query = supabase
      .from("learning_paths")
      .select("*, software:software(slug, name, short_name), learning_path_items(resource_id, position)")
      .eq("is_published", true)
      .order("sort_order")
      .order("title");
    if (softwareId) query = query.eq("software_id", softwareId);
    const { data, error } = await query;
    if (error) throw error;

    type Row = LearningPathWithItems & { learning_path_items: { resource_id: string; position: number }[] };
    const rows = (data ?? []) as unknown as Row[];
    const cards = await getCardsByIds([...new Set(rows.flatMap((r) => r.learning_path_items.map((i) => i.resource_id)))]);
    const byId = new Map(cards.map((c) => [c.id, c]));

    return rows
      .map(({ learning_path_items, ...path }) => ({
        ...path,
        items: [...learning_path_items]
          .sort((a, b) => a.position - b.position)
          .map((i) => byId.get(i.resource_id))
          .filter((c): c is ResourceCard => Boolean(c)),
      }))
      .filter((p) => p.items.length > 0);
  });
}

// Edges are stored one way; read them from the other end with the relation
// flipped, so "A next_level→ B" also shows A as a prerequisite on B's page.
const INVERSE_RELATION: Record<ResourceRelation, ResourceRelation> = {
  same_topic_other_software: "same_topic_other_software",
  next_level: "prerequisite",
  prerequisite: "next_level",
};

async function getRelated(resourceId: string): Promise<RelatedResource[]> {
  const [outgoing, incoming] = await Promise.all([
    supabase.from("resource_related").select("related_id, relation").eq("resource_id", resourceId),
    supabase.from("resource_related").select("resource_id, relation").eq("related_id", resourceId),
  ]);
  if (outgoing.error) throw outgoing.error;
  if (incoming.error) throw incoming.error;

  const edges = new Map<string, ResourceRelation>();
  for (const e of outgoing.data ?? []) edges.set(`${e.related_id}|${e.relation}`, e.relation);
  for (const e of incoming.data ?? []) {
    const relation = INVERSE_RELATION[e.relation as ResourceRelation];
    edges.set(`${e.resource_id}|${relation}`, relation);
  }

  const cards = await getCardsByIds([...new Set([...edges.keys()].map((k) => k.split("|")[0]))]);
  const byId = new Map(cards.map((c) => [c.id, c]));
  return [...edges.entries()]
    .map(([key, relation]) => {
      const card = byId.get(key.split("|")[0]);
      return card ? { ...card, relation } : null;
    })
    .filter((r): r is RelatedResource => r !== null);
}

// No status filter: RLS already hides drafts from everyone but admins, which
// lets admins preview a draft at its real URL.
export async function getResourceBySlug(slug: string): Promise<ResourceDetail | null> {
  const { data, error } = await supabase.from("resources").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [tags, related] = await Promise.all([
    supabase.from("resource_cards").select("software, topics").eq("id", data.id).single(),
    getRelated(data.id),
  ]);
  if (tags.error) throw tags.error;

  return {
    ...data,
    software: tags.data.software as SoftwareRef[],
    topics: tags.data.topics,
    related,
  } as ResourceDetail;
}

// The locked part of a partial/paid resource. RLS returns the row only to
// entitled users (and admins), so a null here means "locked" — the content
// never reaches anyone else's browser.
export async function getResourcePremium(resourceId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("resource_premium")
    .select("payload")
    .eq("resource_id", resourceId)
    .maybeSingle();
  if (error) throw error;
  return (data?.payload as Record<string, unknown> | undefined) ?? null;
}

export type ResourceEvent = "view" | "calculate" | "unlock_click" | "download";

// Fire-and-forget: analytics must never break the page.
export function logResourceEvent(resourceId: string, event: ResourceEvent, userId: string | null): void {
  void supabase
    .from("resource_events")
    .insert({ resource_id: resourceId, event, user_id: userId })
    .then(() => undefined);
}
