import { useEffect, useMemo, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { ConfirmDeleteButton } from "@/admin/components/ConfirmDeleteButton";
import { ResourcesAdminTabs } from "./ResourcesAdminTabs";
import {
  deleteLearningPath,
  listAllLearningPaths,
  listAllResources,
  listAllSoftware,
  saveLearningPath,
  type AdminLearningPath,
  type AdminResourceRow,
} from "@/services/admin/adminResourceService";
import type { Software } from "@/types/resource";

type PathForm = Omit<AdminLearningPath, "id">;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function AdminLearningPathsPage() {
  const [paths, setPaths] = useState<AdminLearningPath[]>([]);
  const [software, setSoftware] = useState<Software[]>([]);
  const [resources, setResources] = useState<AdminResourceRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PathForm | null>(null);
  const [addId, setAddId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    listAllLearningPaths().then(setPaths).catch(() => setError("Couldn't load learning paths."));
  }

  useEffect(() => {
    load();
    listAllSoftware().then(setSoftware).catch(() => {});
    listAllResources().then(setResources).catch(() => {});
  }, []);

  const resourceById = useMemo(() => new Map(resources.map((r) => [r.id, r])), [resources]);
  const softwareById = useMemo(() => new Map(software.map((s) => [s.id, s])), [software]);

  function startEdit(p: AdminLearningPath | null) {
    setError(null);
    setAddId("");
    setEditingId(p?.id ?? null);
    setForm(
      p
        ? { slug: p.slug, title: p.title, description: p.description ?? "", software_id: p.software_id, sort_order: p.sort_order, is_published: p.is_published, resourceIds: p.resourceIds }
        : { slug: "", title: "", description: "", software_id: null, sort_order: (paths.at(-1)?.sort_order ?? 0) + 10, is_published: true, resourceIds: [] }
    );
  }

  function move(index: number, delta: number) {
    setForm((f) => {
      if (!f) return f;
      const ids = [...f.resourceIds];
      const [item] = ids.splice(index, 1);
      ids.splice(index + delta, 0, item);
      return { ...f, resourceIds: ids };
    });
  }

  async function handleSave() {
    if (!form) return;
    if (!form.title.trim()) return setError("Title is required.");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) return setError("Slug may only contain lowercase letters, numbers and hyphens.");
    setSaving(true);
    setError(null);
    try {
      await saveLearningPath(editingId, { ...form, description: form.description?.trim() || null });
      setForm(null);
      load();
    } catch (err) {
      setError((err as { code?: string })?.code === "23505" ? "That slug is already in use." : "Couldn't save this path.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLearningPath(id);
      load();
    } catch {
      setError("Couldn't delete this path.");
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Resources</h1>
        {!form && <Button onClick={() => startEdit(null)}>+ New learning path</Button>}
      </div>
      <ResourcesAdminTabs />

      <p className="admin-muted" style={{ marginBottom: "var(--space-4)" }}>
        “Start here” tiles: an ordered list of resources. Paths tied to a software show on that software's page; all
        published paths show on the Resources hub. Draft resources in a path are skipped on the public site.
      </p>

      {error && <FormMessage type="error">{error}</FormMessage>}

      {form && (
        <div className="admin-form-card admin-form-card--wide">
          <h2 className="admin-section-title">{editingId ? "Edit learning path" : "New learning path"}</h2>
          <div className="admin-form-row">
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => f && { ...f, title: e.target.value, slug: editingId ? f.slug : slugify(e.target.value) })}
            />
            <TextField label="Slug" value={form.slug} onChange={(e) => setForm((f) => f && { ...f, slug: e.target.value.toLowerCase() })} />
          </div>
          <TextField label="Description" value={form.description ?? ""} onChange={(e) => setForm((f) => f && { ...f, description: e.target.value })} />
          <div className="admin-form-row">
            <SelectField
              label="Software"
              options={[{ value: "", label: "None — hub only" }, ...software.map((s) => ({ value: s.id, label: s.name }))]}
              value={form.software_id ?? ""}
              onChange={(e) => setForm((f) => f && { ...f, software_id: e.target.value || null })}
            />
            <TextField
              label="Sort order"
              type="number"
              value={String(form.sort_order)}
              onChange={(e) => setForm((f) => f && { ...f, sort_order: Number(e.target.value) || 0 })}
            />
          </div>

          <span className="field__label">Steps</span>
          <ol className="admin-ordered-list">
            {form.resourceIds.map((rid, i) => {
              const r = resourceById.get(rid);
              return (
                <li key={rid}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span className="admin-ordered-list__title">
                    {r?.title ?? "…"}
                    {r?.status === "draft" && <span className="admin-muted"> (draft)</span>}
                  </span>
                  <button type="button" className="admin-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                    ↑
                  </button>
                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={() => move(i, 1)}
                    disabled={i === form.resourceIds.length - 1}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={() => setForm((f) => f && { ...f, resourceIds: f.resourceIds.filter((x) => x !== rid) })}
                    aria-label="Remove step"
                  >
                    ×
                  </button>
                </li>
              );
            })}
            {form.resourceIds.length === 0 && <li className="admin-muted">No steps yet.</li>}
          </ol>
          <div className="admin-toolbar">
            <SelectField
              label="Add a step"
              placeholder="Choose a resource"
              options={resources.filter((r) => !form.resourceIds.includes(r.id)).map((r) => ({ value: r.id, label: r.title }))}
              value={addId}
              onChange={(e) => setAddId(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!addId}
              onClick={() => {
                setForm((f) => f && { ...f, resourceIds: [...f.resourceIds, addId] });
                setAddId("");
              }}
            >
              Add
            </Button>
          </div>

          <label className="admin-checkbox-row">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((f) => f && { ...f, is_published: e.target.checked })}
            />
            Published
          </label>
          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save path"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Title</th>
              <th>Software</th>
              <th>Steps</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paths.map((p) => (
              <tr key={p.id}>
                <td>{p.sort_order}</td>
                <td>{p.title}</td>
                <td>{p.software_id ? softwareById.get(p.software_id)?.name ?? "…" : "Hub only"}</td>
                <td>{p.resourceIds.length}</td>
                <td>
                  <span className={`admin-badge ${p.is_published ? "admin-badge--on" : ""}`}>
                    {p.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button type="button" className="admin-link" onClick={() => startEdit(p)}>
                    Edit
                  </button>
                  <ConfirmDeleteButton onConfirm={() => handleDelete(p.id)} />
                </td>
              </tr>
            ))}
            {paths.length === 0 && (
              <tr>
                <td colSpan={6}>No learning paths yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
