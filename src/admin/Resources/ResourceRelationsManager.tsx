import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SelectField } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import {
  addRelation,
  listAllResources,
  listRelations,
  removeRelation,
  type AdminResourceRow,
  type RelationEdge,
} from "@/services/admin/adminResourceService";
import { RESOURCE_RELATIONS, RESOURCE_RELATION_LABELS, type ResourceRelation } from "@/types/resource";

// How an edge reads from this resource's point of view. Edges are stored one
// way (resource —relation→ related); the public page flips incoming ones the
// same way.
function describe(edge: RelationEdge, selfId: string): { otherId: string; label: string } {
  if (edge.resource_id === selfId) {
    return { otherId: edge.related_id, label: RESOURCE_RELATION_LABELS[edge.relation] };
  }
  const flipped: Record<ResourceRelation, ResourceRelation> = {
    same_topic_other_software: "same_topic_other_software",
    next_level: "prerequisite",
    prerequisite: "next_level",
  };
  return { otherId: edge.resource_id, label: RESOURCE_RELATION_LABELS[flipped[edge.relation]] };
}

export function ResourceRelationsManager({ resourceId }: { resourceId: string }) {
  const [edges, setEdges] = useState<RelationEdge[]>([]);
  const [all, setAll] = useState<AdminResourceRow[]>([]);
  const [relatedId, setRelatedId] = useState("");
  const [relation, setRelation] = useState<ResourceRelation>("same_topic_other_software");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    listRelations(resourceId).then(setEdges).catch(() => setError("Couldn't load related resources."));
  }

  useEffect(load, [resourceId]);
  useEffect(() => {
    listAllResources().then(setAll).catch(() => {});
  }, []);

  const byId = useMemo(() => new Map(all.map((r) => [r.id, r])), [all]);

  async function handleAdd() {
    if (!relatedId) return;
    setSaving(true);
    setError(null);
    try {
      await addRelation({ resource_id: resourceId, related_id: relatedId, relation });
      setRelatedId("");
      load();
    } catch {
      setError("Couldn't add that link — it may already exist.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(edge: RelationEdge) {
    setError(null);
    try {
      await removeRelation(edge);
      load();
    } catch {
      setError("Couldn't remove that link.");
    }
  }

  return (
    <div className="admin-form-card admin-form-card--wide">
      <h2 className="admin-section-title">Related resources</h2>
      <p className="admin-muted" style={{ marginBottom: "var(--space-4)" }}>
        Links show on both pages. “Same topic in other software” builds the Hand calc ↔ software chain, e.g. the hand
        calculator ↔ the ANSYS tutorial ↔ the SolidWorks Simulation tutorial.
      </p>

      {error && <FormMessage type="error">{error}</FormMessage>}

      <div className="admin-table-wrap" style={{ marginBottom: "var(--space-6)" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Relation (from this page)</th>
              <th>Resource</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {edges.map((e) => {
              const { otherId, label } = describe(e, resourceId);
              const other = byId.get(otherId);
              return (
                <tr key={`${e.resource_id}|${e.related_id}|${e.relation}`}>
                  <td>{label}</td>
                  <td>
                    {other ? <Link to={`/admin/resources/${other.id}`}>{other.title}</Link> : "…"}
                    {other?.status === "draft" && <span className="admin-muted"> (draft)</span>}
                  </td>
                  <td>
                    <button type="button" className="admin-link admin-link--danger" onClick={() => handleRemove(e)}>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
            {edges.length === 0 && (
              <tr>
                <td colSpan={3}>No related resources yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-form-row">
        <SelectField
          label="Link to"
          placeholder="Choose a resource"
          options={all.filter((r) => r.id !== resourceId).map((r) => ({ value: r.id, label: r.title }))}
          value={relatedId}
          onChange={(e) => setRelatedId(e.target.value)}
        />
        <SelectField
          label="Relation"
          options={RESOURCE_RELATIONS.map((r) => ({
            value: r,
            label: r === "next_level" ? "It's the next level after this" : r === "prerequisite" ? "Do it before this" : RESOURCE_RELATION_LABELS[r],
          }))}
          value={relation}
          onChange={(e) => setRelation(e.target.value as ResourceRelation)}
        />
      </div>
      <Button type="button" variant="outline" onClick={handleAdd} disabled={saving || !relatedId}>
        {saving ? "Adding…" : "+ Add link"}
      </Button>
    </div>
  );
}
