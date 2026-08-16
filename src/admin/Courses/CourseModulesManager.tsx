import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ConfirmDeleteButton } from "@/admin/components/ConfirmDeleteButton";
import {
  createModule,
  deleteModule,
  listModulesByCourse,
  updateModule,
} from "@/services/admin/adminModuleService";
import type { CourseModule } from "@/types/course";

export function CourseModulesManager({ courseId }: { courseId: string }) {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOrder, setEditOrder] = useState(1);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
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
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateModule(editingId, { title: editTitle, description: editDescription, order_number: editOrder });
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
      await createModule({ course_id: courseId, title: newTitle.trim(), description: newDescription || null, order_number: nextOrder });
      setNewTitle("");
      setNewDescription("");
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
              {modules.map((m) =>
                editingId === m.id ? (
                  <tr key={m.id}>
                    <td>
                      <input
                        type="number"
                        className="field__input"
                        value={editOrder}
                        onChange={(e) => setEditOrder(Number(e.target.value))}
                        style={{ width: 64 }}
                      />
                    </td>
                    <td>
                      <input
                        className="field__input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="field__input"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </td>
                    <td>
                      <button type="button" className="admin-link" onClick={saveEdit} disabled={saving}>
                        Save
                      </button>
                      <button type="button" className="admin-link" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={m.id}>
                    <td>{m.order_number}</td>
                    <td>{m.title}</td>
                    <td>{m.description ?? "—"}</td>
                    <td>
                      <button type="button" className="admin-link" onClick={() => startEdit(m)}>
                        Edit
                      </button>
                      <ConfirmDeleteButton onConfirm={() => handleDelete(m.id)} />
                    </td>
                  </tr>
                )
              )}
              {modules.length === 0 && (
                <tr>
                  <td colSpan={4}>No modules yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-form-row">
        <TextField label="New Module Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <TextField
          label="Description (optional)"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
        />
      </div>
      <Button type="button" variant="outline" onClick={handleAdd} disabled={saving || !newTitle.trim()}>
        + Add Module
      </Button>
    </div>
  );
}
