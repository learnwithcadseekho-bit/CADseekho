import { supabase } from "@/lib/supabaseClient";
import type {
  LearningPath,
  Resource,
  ResourceCard,
  ResourceRelation,
  ResourceStatus,
  Software,
} from "@/types/resource";

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export type AdminResourceRow = ResourceCard & { status: ResourceStatus; updated_at: string };

export async function listAllResources(): Promise<AdminResourceRow[]> {
  // resource_cards is security_invoker, so admins see drafts too.
  const { data, error } = await supabase.from("resource_cards").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminResourceRow[];
}

export type ResourceInput = Omit<Resource, "id" | "published_at" | "created_at" | "updated_at">;

export interface ResourceEditData {
  resource: Resource;
  softwareIds: string[];
  topicIds: string[];
  premium: Record<string, unknown> | null;
}

export async function getResourceForEdit(id: string): Promise<ResourceEditData | null> {
  const [res, sw, tp, pr] = await Promise.all([
    supabase.from("resources").select("*").eq("id", id).maybeSingle(),
    supabase.from("resource_software").select("software_id").eq("resource_id", id),
    supabase.from("resource_topics").select("topic_id").eq("resource_id", id),
    supabase.from("resource_premium").select("payload").eq("resource_id", id).maybeSingle(),
  ]);
  for (const r of [res, sw, tp, pr]) if (r.error) throw r.error;
  if (!res.data) return null;
  return {
    resource: res.data as Resource,
    softwareIds: (sw.data ?? []).map((r) => r.software_id),
    topicIds: (tp.data ?? []).map((r) => r.topic_id),
    premium: (pr.data?.payload as Record<string, unknown> | undefined) ?? null,
  };
}

async function syncLinks(table: "resource_software" | "resource_topics", column: string, resourceId: string, ids: string[]) {
  const { data, error } = await supabase.from(table).select(column).eq("resource_id", resourceId);
  if (error) throw error;
  const current = new Set((data ?? []).map((r) => (r as unknown as Record<string, string>)[column]));
  const wanted = new Set(ids);

  const toRemove = [...current].filter((x) => !wanted.has(x));
  const toAdd = [...wanted].filter((x) => !current.has(x));
  if (toRemove.length > 0) {
    const del = await supabase.from(table).delete().eq("resource_id", resourceId).in(column, toRemove);
    if (del.error) throw del.error;
  }
  if (toAdd.length > 0) {
    const ins = await supabase.from(table).insert(toAdd.map((x) => ({ resource_id: resourceId, [column]: x })));
    if (ins.error) throw ins.error;
  }
}

/** Creates or updates a resource together with its tags and locked content. */
export async function saveResource(
  id: string | null,
  input: ResourceInput,
  softwareIds: string[],
  topicIds: string[],
  premium: Record<string, unknown> | null
): Promise<string> {
  const { data, error } = id
    ? await supabase.from("resources").update(input).eq("id", id).select("id").single()
    : await supabase.from("resources").insert(input).select("id").single();
  if (error) throw error;
  const resourceId = data.id as string;

  await syncLinks("resource_software", "software_id", resourceId, softwareIds);
  await syncLinks("resource_topics", "topic_id", resourceId, topicIds);

  if (premium) {
    const up = await supabase.from("resource_premium").upsert({ resource_id: resourceId, payload: premium });
    if (up.error) throw up.error;
  } else {
    const del = await supabase.from("resource_premium").delete().eq("resource_id", resourceId);
    if (del.error) throw del.error;
  }
  return resourceId;
}

export async function setResourceStatus(id: string, status: ResourceStatus): Promise<void> {
  const { error } = await supabase.from("resources").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteResource(id: string): Promise<void> {
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export interface RelationEdge {
  resource_id: string;
  related_id: string;
  relation: ResourceRelation;
}

/** Every edge touching this resource, in either direction. */
export async function listRelations(resourceId: string): Promise<RelationEdge[]> {
  const { data, error } = await supabase
    .from("resource_related")
    .select("resource_id, related_id, relation")
    .or(`resource_id.eq.${resourceId},related_id.eq.${resourceId}`);
  if (error) throw error;
  return (data ?? []) as RelationEdge[];
}

export async function addRelation(edge: RelationEdge): Promise<void> {
  const { error } = await supabase.from("resource_related").insert(edge);
  if (error) throw error;
}

export async function removeRelation(edge: RelationEdge): Promise<void> {
  const { error } = await supabase
    .from("resource_related")
    .delete()
    .eq("resource_id", edge.resource_id)
    .eq("related_id", edge.related_id)
    .eq("relation", edge.relation);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Usage stats
// ---------------------------------------------------------------------------

export interface ResourceUsage {
  views: number;
  calculations: number;
  unlockClicks: number;
}

/** Event counts for the last `days` days. head+count queries, so no rows are transferred. */
export async function getResourceUsage(resourceId: string, days = 30): Promise<ResourceUsage> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const count = async (event: string) => {
    const { count: n, error } = await supabase
      .from("resource_events")
      .select("id", { count: "exact", head: true })
      .eq("resource_id", resourceId)
      .eq("event", event)
      .gte("created_at", since);
    if (error) throw error;
    return n ?? 0;
  };
  const [views, calculations, unlockClicks] = await Promise.all([count("view"), count("calculate"), count("unlock_click")]);
  return { views, calculations, unlockClicks };
}

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

// Admin reads bypass the public in-memory cache so edits show up at once.
export async function listAllSoftware(): Promise<Software[]> {
  const { data, error } = await supabase.from("software").select("*").order("sort_order").order("name");
  if (error) throw error;
  return (data ?? []) as Software[];
}

export type SoftwareInput = Omit<Software, "id">;

export async function saveSoftware(id: string | null, input: SoftwareInput): Promise<void> {
  const { error } = id
    ? await supabase.from("software").update(input).eq("id", id)
    : await supabase.from("software").insert(input);
  if (error) throw error;
}

export async function deleteSoftware(id: string): Promise<void> {
  const { error } = await supabase.from("software").delete().eq("id", id);
  if (error) throw error;
}

export interface AdminTopic {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  softwareIds: string[];
}

export async function listTopicsWithSoftware(): Promise<AdminTopic[]> {
  const { data, error } = await supabase
    .from("topics")
    .select("*, topic_software(software_id)")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []).map(({ topic_software, ...t }) => ({
    ...t,
    softwareIds: (topic_software as { software_id: string }[]).map((x) => x.software_id),
  })) as AdminTopic[];
}

export async function saveTopic(id: string | null, input: Omit<AdminTopic, "id">): Promise<void> {
  const { softwareIds, ...row } = input;
  const { data, error } = id
    ? await supabase.from("topics").update(row).eq("id", id).select("id").single()
    : await supabase.from("topics").insert(row).select("id").single();
  if (error) throw error;
  const topicId = data.id as string;

  const del = await supabase.from("topic_software").delete().eq("topic_id", topicId);
  if (del.error) throw del.error;
  if (softwareIds.length > 0) {
    const ins = await supabase
      .from("topic_software")
      .insert(softwareIds.map((software_id) => ({ topic_id: topicId, software_id })));
    if (ins.error) throw ins.error;
  }
}

export async function deleteTopic(id: string): Promise<void> {
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) throw error;
}

export interface SynonymGroup {
  id: string;
  terms: string[];
}

export async function listSynonymGroups(): Promise<SynonymGroup[]> {
  const { data, error } = await supabase.from("search_synonym_groups").select("*");
  if (error) throw error;
  return (data ?? []) as SynonymGroup[];
}

export async function saveSynonymGroup(id: string | null, terms: string[]): Promise<void> {
  const { error } = id
    ? await supabase.from("search_synonym_groups").update({ terms }).eq("id", id)
    : await supabase.from("search_synonym_groups").insert({ terms });
  if (error) throw error;
}

export async function deleteSynonymGroup(id: string): Promise<void> {
  const { error } = await supabase.from("search_synonym_groups").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Learning paths
// ---------------------------------------------------------------------------

export interface AdminLearningPath extends LearningPath {
  resourceIds: string[];
}

export async function listAllLearningPaths(): Promise<AdminLearningPath[]> {
  const { data, error } = await supabase
    .from("learning_paths")
    .select("*, learning_path_items(resource_id, position)")
    .order("sort_order")
    .order("title");
  if (error) throw error;
  return (data ?? []).map(({ learning_path_items, ...p }) => ({
    ...p,
    resourceIds: [...(learning_path_items as { resource_id: string; position: number }[])]
      .sort((a, b) => a.position - b.position)
      .map((i) => i.resource_id),
  })) as AdminLearningPath[];
}

export async function saveLearningPath(id: string | null, input: Omit<AdminLearningPath, "id">): Promise<void> {
  const { resourceIds, ...row } = input;
  const { data, error } = id
    ? await supabase.from("learning_paths").update(row).eq("id", id).select("id").single()
    : await supabase.from("learning_paths").insert(row).select("id").single();
  if (error) throw error;
  const pathId = data.id as string;

  // (path_id, position) is unique, so reordering in place would collide —
  // replace the whole list instead.
  const del = await supabase.from("learning_path_items").delete().eq("path_id", pathId);
  if (del.error) throw del.error;
  if (resourceIds.length > 0) {
    const ins = await supabase
      .from("learning_path_items")
      .insert(resourceIds.map((resource_id, i) => ({ path_id: pathId, resource_id, position: i + 1 })));
    if (ins.error) throw ins.error;
  }
}

export async function deleteLearningPath(id: string): Promise<void> {
  const { error } = await supabase.from("learning_paths").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Entitlements
// ---------------------------------------------------------------------------

export interface EntitlementRow {
  id: string;
  user_id: string;
  entitlement: string;
  source: string;
  granted_at: string;
  expires_at: string | null;
  email: string | null;
  full_name: string | null;
}

export async function listEntitlements(): Promise<EntitlementRow[]> {
  const { data, error } = await supabase
    .from("user_entitlements")
    .select("*")
    .order("granted_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];

  // user_entitlements references auth.users, not profiles, so PostgREST
  // can't embed the profile — look the users up separately.
  const ids = [...new Set(rows.map((r) => r.user_id as string))];
  const profiles = new Map<string, { email: string; full_name: string }>();
  if (ids.length > 0) {
    const p = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
    if (p.error) throw p.error;
    for (const x of p.data ?? []) profiles.set(x.id, x);
  }
  return rows.map((r) => ({
    ...r,
    email: profiles.get(r.user_id)?.email ?? null,
    full_name: profiles.get(r.user_id)?.full_name ?? null,
  })) as EntitlementRow[];
}

export class UserNotFoundError extends Error {}

export async function grantEntitlement(email: string, entitlement: string, expiresAt: string | null): Promise<void> {
  // Case-insensitive exact match: escape ilike's wildcards (_ is common in emails).
  const pattern = email.trim().replace(/[\\%_]/g, "\\$&");
  const p = await supabase.from("profiles").select("id").ilike("email", pattern).maybeSingle();
  if (p.error) throw p.error;
  if (!p.data) throw new UserNotFoundError(email);

  const { error } = await supabase.from("user_entitlements").upsert(
    { user_id: p.data.id, entitlement, source: "admin", expires_at: expiresAt },
    { onConflict: "user_id,entitlement" }
  );
  if (error) throw error;
}

export async function revokeEntitlement(id: string): Promise<void> {
  const { error } = await supabase.from("user_entitlements").delete().eq("id", id);
  if (error) throw error;
}

/** Users with at least one enrolled course — they hold 'member' automatically. */
export async function countEnrolledMembers(): Promise<number> {
  const { data, error } = await supabase.from("course_registrations").select("user_id").eq("status", "enrolled");
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.user_id)).size;
}
