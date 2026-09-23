import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ConfirmDeleteButton } from "@/admin/components/ConfirmDeleteButton";
import { RichTextEditor } from "@/admin/components/RichTextEditor";
import { FileUploadField } from "@/admin/components/FileUploadField";
import {
  createModule,
  deleteModule,
  listModulesByCourse,
  updateModule,
} from "@/services/admin/adminModuleService";
import type { CourseModule } from "@/types/course";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

interface ModuleMedia {
  image: string | null;
  model3d: string | null;
  media_alt: string | null;
}

const NO_MEDIA: ModuleMedia = { image: null, model3d: null, media_alt: null };

// Optional per-chapter picture and/or .glb model shown beside the syllabus
// entry. The image doubles as the 3D viewer's poster while the model loads.
function ModuleMediaFields({ value, onChange }: { value: ModuleMedia; onChange: (value: ModuleMedia) => void }) {
  return (
    <>
      <FileUploadField
        label="Chapter Image (optional — stress/deformation plot, mesh, CAD part)"
        bucket="course-images"
        accept="image/*"
        value={value.image}
        onChange={(image) => onChange({ ...value, image })}
      />
      {value.image && (
        <button type="button" className="admin-link" onClick={() => onChange({ ...value, image: null })}>
          Remove image
        </button>
      )}
      <FileUploadField
        label="3D Model (optional, .glb — Draco/meshopt compress anything over ~3 MB first)"
        bucket="course-models"
        accept=".glb,model/gltf-binary"
        value={value.model3d}
        onChange={(model3d) => onChange({ ...value, model3d })}
      />
      {value.model3d && (
        <button type="button" className="admin-link" onClick={() => onChange({ ...value, model3d: null })}>
          Remove 3D model
        </button>
      )}
      <TextField
        label="Media Alt Text (what the image/model shows)"
        placeholder="e.g. Stress contour plot of a cantilever beam under point load"
        value={value.media_alt ?? ""}
        onChange={(e) => onChange({ ...value, media_alt: e.target.value || null })}
      />
    </>
  );
}

export function CourseModulesManager({ courseId }: { courseId: string }) {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOrder, setEditOrder] = useState(1);
  const [editMedia, setEditMedia] = useState<ModuleMedia>(NO_MEDIA);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMedia, setNewMedia] = useState<ModuleMedia>(NO_MEDIA);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    listModulesByCourse(courseId)
      .then(setModules)
      .finally(() => setLoading(false));
  }

  useEffect(load, [courseId]);

  function startEdit(m: CourseModule) {
    setEditingId(m.id);
    setEditTitle(m.title);
    setEditDescription(m.description ?? "");
    setEditOrder(m.order_number);
    setEditMedia({ image: m.image, model3d: m.model3d, media_alt: m.media_alt });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateModule(editingId, {
        title: editTitle,
        description: editDescription,
        order_number: editOrder,
        ...editMedia,
      });
      setEditingId(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const nextOrder = modules.length > 0 ? Math.max(...modules.map((m) => m.order_number)) + 1 : 1;
      await createModule({
        course_id: courseId,
        title: newTitle.trim(),
        description: newDescription || null,
        order_number: nextOrder,
        ...newMedia,
      });
      setNewTitle("");
      setNewDescription("");
      setNewMedia(NO_MEDIA);
      setShowAddForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteModule(id);
    load();
  }

  return (
    <div className="admin-form-card" style={{ maxWidth: 720 }}>
      <h2 style={{ marginBottom: "var(--space-4)" }}>Course Syllabus (Modules)</h2>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="admin-table-wrap" style={{ marginBottom: "var(--space-6)" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.id}>
                  <td>{m.order_number}</td>
                  <td>{m.title}</td>
                  <td style={{ maxWidth: 240 }}>
                    {m.description ? stripHtml(m.description).slice(0, 80) || "—" : "—"}
                  </td>
                  <td>
                    <button type="button" className="admin-link" onClick={() => startEdit(m)}>
                      Edit
                    </button>
                    <ConfirmDeleteButton onConfirm={() => handleDelete(m.id)} />
                  </td>
                </tr>
              ))}
              {modules.length === 0 && (
                <tr>
                  <td colSpan={4}>No modules yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingId && (
        <div className="admin-form-card" style={{ background: "var(--paper)", marginBottom: "var(--space-6)" }}>
          <h3 style={{ marginBottom: "var(--space-4)" }}>Edit Module</h3>
          <div className="admin-form-row">
            <TextField label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <TextField
              label="Order"
              type="number"
              value={editOrder}
              onChange={(e) => setEditOrder(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label className="field__label">Description</label>
            <RichTextEditor value={editDescription} onChange={setEditDescription} />
          </div>
          <ModuleMediaFields value={editMedia} onChange={setEditMedia} />
          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="button" onClick={saveEdit} disabled={saving}>
              {saving ? "Saving…" : "Save Module"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showAddForm ? (
        <div className="admin-form-card" style={{ background: "var(--paper)" }}>
          <h3 style={{ marginBottom: "var(--space-4)" }}>New Module</h3>
          <TextField label="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <div className="field">
            <label className="field__label">Description (optional)</label>
            <RichTextEditor value={newDescription} onChange={setNewDescription} />
          </div>
          <ModuleMediaFields value={newMedia} onChange={setNewMedia} />
          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="button" onClick={handleAdd} disabled={saving || !newTitle.trim()}>
              {saving ? "Adding…" : "Add Module"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setShowAddForm(true)}>
          + Add Module
        </Button>
      )}
    </div>
  );
}
