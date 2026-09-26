import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { ConfirmDeleteButton } from "@/admin/components/ConfirmDeleteButton";
import { ResourcesAdminTabs } from "./ResourcesAdminTabs";
import {
  deleteSoftware,
  deleteSynonymGroup,
  deleteTopic,
  listAllSoftware,
  listSynonymGroups,
  listTopicsWithSoftware,
  saveSoftware,
  saveSynonymGroup,
  saveTopic,
  type AdminTopic,
  type SoftwareInput,
  type SynonymGroup,
} from "@/services/admin/adminResourceService";
import type { Software } from "@/types/resource";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function saveErrorMessage(err: unknown) {
  return (err as { code?: string })?.code === "23505" ? "That slug is already in use." : "Couldn't save. Please try again.";
}

export default function AdminResourceTaxonomyPage() {
  const [software, setSoftware] = useState<Software[]>([]);
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [synonyms, setSynonyms] = useState<SynonymGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    Promise.all([listAllSoftware(), listTopicsWithSoftware(), listSynonymGroups()])
      .then(([s, t, g]) => {
        setSoftware(s);
        setTopics(t);
        setSynonyms(g);
      })
      .catch(() => setError("Couldn't load the taxonomy."));
  }

  useEffect(load, []);

  return (
    <div>
      <div className="admin-page-header">
        <h1>Resources</h1>
      </div>
      <ResourcesAdminTabs />
      {error && <FormMessage type="error">{error}</FormMessage>}

      <SoftwareSection software={software} onChange={load} />
      <TopicsSection topics={topics} software={software} onChange={load} />
      <SynonymsSection groups={synonyms} onChange={load} />
    </div>
  );
}

// ---------------------------------------------------------------------------

const emptySoftware: SoftwareInput = {
  slug: "",
  name: "",
  short_name: "",
  description: "",
  course_url: "",
  sort_order: 0,
};

function SoftwareSection({ software, onChange }: { software: Software[]; onChange: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SoftwareInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(s: Software | null) {
    setError(null);
    setEditingId(s?.id ?? null);
    setForm(
      s
        ? { slug: s.slug, name: s.name, short_name: s.short_name, description: s.description ?? "", course_url: s.course_url ?? "", sort_order: s.sort_order }
        : { ...emptySoftware, sort_order: (software.at(-1)?.sort_order ?? 0) + 10 }
    );
  }

  async function handleSave() {
    if (!form) return;
    if (!form.name.trim() || !form.short_name.trim()) return setError("Name and short label are required.");
    if (!SLUG_PATTERN.test(form.slug)) return setError("Slug may only contain lowercase letters, numbers and hyphens.");
    setSaving(true);
    setError(null);
    try {
      await saveSoftware(editingId, {
        ...form,
        description: form.description?.trim() || null,
        course_url: form.course_url?.trim() || null,
      });
      setForm(null);
      onChange();
    } catch (err) {
      setError(saveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSoftware(id);
      onChange();
    } catch {
      setError("Couldn't delete this software.");
    }
  }

  return (
    <div className="admin-form-card admin-form-card--wide">
      <h2 className="admin-section-title">Software</h2>
      <p className="admin-muted" style={{ marginBottom: "var(--space-4)" }}>
        Each one gets a landing page at /resources/software/&lt;slug&gt;. The short label shows on resource cards.
      </p>
      {error && <FormMessage type="error">{error}</FormMessage>}
      <div className="admin-table-wrap" style={{ marginBottom: "var(--space-4)" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Name</th>
              <th>Label</th>
              <th>Slug</th>
              <th>Course link</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {software.map((s) => (
              <tr key={s.id}>
                <td>{s.sort_order}</td>
                <td>{s.name}</td>
                <td>{s.short_name}</td>
                <td>{s.slug}</td>
                <td>{s.course_url ?? "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button type="button" className="admin-link" onClick={() => startEdit(s)}>
                    Edit
                  </button>
                  <ConfirmDeleteButton
                    onConfirm={() => handleDelete(s.id)}
                    confirmMessage={`Delete ${s.name}? It will be removed from every resource, topic and learning path that uses it.`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form ? (
        <div className="admin-form-card" style={{ background: "var(--paper)", marginBottom: 0 }}>
          <h3 style={{ marginBottom: "var(--space-4)" }}>{editingId ? "Edit software" : "New software"}</h3>
          <div className="admin-form-row">
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => f && { ...f, name: e.target.value, slug: editingId ? f.slug : slugify(e.target.value) })
              }
            />
            <TextField label="Short label (card badge)" value={form.short_name} onChange={(e) => setForm((f) => f && { ...f, short_name: e.target.value })} />
          </div>
          <div className="admin-form-row">
            <TextField label="Slug" value={form.slug} onChange={(e) => setForm((f) => f && { ...f, slug: e.target.value.toLowerCase() })} />
            <TextField
              label="Sort order"
              type="number"
              value={String(form.sort_order)}
              onChange={(e) => setForm((f) => f && { ...f, sort_order: Number(e.target.value) || 0 })}
            />
          </div>
          <TextField label="Description (landing page intro)" value={form.description ?? ""} onChange={(e) => setForm((f) => f && { ...f, description: e.target.value })} />
          <TextField
            label="Matching course link"
            placeholder="/courses/category/ansys"
            value={form.course_url ?? ""}
            onChange={(e) => setForm((f) => f && { ...f, course_url: e.target.value })}
          />
          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save software"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => startEdit(null)}>
          + Add software
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type TopicForm = Omit<AdminTopic, "id">;

function TopicsSection({ topics, software, onChange }: { topics: AdminTopic[]; software: Software[]; onChange: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TopicForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const softwareName = new Map(software.map((s) => [s.id, s.short_name]));

  function startEdit(t: AdminTopic | null) {
    setError(null);
    setEditingId(t?.id ?? null);
    setForm(
      t
        ? { slug: t.slug, name: t.name, description: t.description ?? "", sort_order: t.sort_order, softwareIds: t.softwareIds }
        : { slug: "", name: "", description: "", sort_order: (topics.at(-1)?.sort_order ?? 0) + 10, softwareIds: [] }
    );
  }

  async function handleSave() {
    if (!form) return;
    if (!form.name.trim()) return setError("Name is required.");
    if (!SLUG_PATTERN.test(form.slug)) return setError("Slug may only contain lowercase letters, numbers and hyphens.");
    setSaving(true);
    setError(null);
    try {
      await saveTopic(editingId, { ...form, description: form.description?.trim() || null });
      setForm(null);
      onChange();
    } catch (err) {
      setError(saveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTopic(id);
      onChange();
    } catch {
      setError("Couldn't delete this topic.");
    }
  }

  return (
    <div className="admin-form-card admin-form-card--wide">
      <h2 className="admin-section-title">Topics</h2>
      <p className="admin-muted" style={{ marginBottom: "var(--space-4)" }}>
        One topic is shared by every tool — tick the software it applies to instead of creating a copy per tool. That
        decides which topic filters show on each software page.
      </p>
      {error && <FormMessage type="error">{error}</FormMessage>}
      <div className="admin-table-wrap" style={{ marginBottom: "var(--space-4)" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Name</th>
              <th>Slug</th>
              <th>Applies to</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.id}>
                <td>{t.sort_order}</td>
                <td>{t.name}</td>
                <td>{t.slug}</td>
                <td style={{ maxWidth: 280 }}>{t.softwareIds.map((id) => softwareName.get(id)).filter(Boolean).join(", ") || "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button type="button" className="admin-link" onClick={() => startEdit(t)}>
                    Edit
                  </button>
                  <ConfirmDeleteButton
                    onConfirm={() => handleDelete(t.id)}
                    confirmMessage={`Delete the topic “${t.name}”? It will be removed from every resource tagged with it.`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form ? (
        <div className="admin-form-card" style={{ background: "var(--paper)", marginBottom: 0 }}>
          <h3 style={{ marginBottom: "var(--space-4)" }}>{editingId ? "Edit topic" : "New topic"}</h3>
          <div className="admin-form-row">
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => f && { ...f, name: e.target.value, slug: editingId ? f.slug : slugify(e.target.value) })
              }
            />
            <TextField label="Slug" value={form.slug} onChange={(e) => setForm((f) => f && { ...f, slug: e.target.value.toLowerCase() })} />
          </div>
          <div className="admin-form-row">
            <TextField label="Description (topic page intro)" value={form.description ?? ""} onChange={(e) => setForm((f) => f && { ...f, description: e.target.value })} />
            <TextField
              label="Sort order"
              type="number"
              value={String(form.sort_order)}
              onChange={(e) => setForm((f) => f && { ...f, sort_order: Number(e.target.value) || 0 })}
            />
          </div>
          <CheckboxGroup
            label="Applies to"
            options={software.map((s) => ({ value: s.id, label: s.name }))}
            value={form.softwareIds}
            onChange={(v) => setForm((f) => f && { ...f, softwareIds: v })}
          />
          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save topic"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => startEdit(null)}>
          + Add topic
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SynonymsSection({ groups, onChange }: { groups: SynonymGroup[]; onChange: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const terms = [...new Set((text ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
    if (terms.length < 2) return setError("A synonym group needs at least two terms, separated by commas.");
    setError(null);
    try {
      await saveSynonymGroup(editingId, terms);
      setText(null);
      onChange();
    } catch {
      setError("Couldn't save this group.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSynonymGroup(id);
      onChange();
    } catch {
      setError("Couldn't delete this group.");
    }
  }

  return (
    <div className="admin-form-card admin-form-card--wide">
      <h2 className="admin-section-title">Search synonyms</h2>
      <p className="admin-muted" style={{ marginBottom: "var(--space-4)" }}>
        Searching for any term in a group also finds resources that use the others — e.g. “scf” finds “stress
        concentration”.
      </p>
      {error && <FormMessage type="error">{error}</FormMessage>}
      <div className="admin-table-wrap" style={{ marginBottom: "var(--space-4)" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Interchangeable terms</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id}>
                <td>{g.terms.join(" · ")}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="admin-link"
                    onClick={() => {
                      setEditingId(g.id);
                      setText(g.terms.join(", "));
                    }}
                  >
                    Edit
                  </button>
                  <ConfirmDeleteButton onConfirm={() => handleDelete(g.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {text !== null ? (
        <div className="admin-form-card" style={{ background: "var(--paper)", marginBottom: 0 }}>
          <TextField
            label="Terms, comma-separated"
            placeholder="fos, factor of safety, safety factor"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="button" onClick={handleSave}>
              Save group
            </Button>
            <Button type="button" variant="outline" onClick={() => setText(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEditingId(null);
            setText("");
          }}
        >
          + Add synonym group
        </Button>
      )}
    </div>
  );
}
