import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ConfirmDeleteButton } from "@/admin/components/ConfirmDeleteButton";
import { FileUploadField } from "@/admin/components/FileUploadField";
import {
  createTestimonial,
  deleteTestimonial,
  listTestimonialsByCourse,
  updateTestimonial,
} from "@/services/admin/adminTestimonialService";
import type { CourseTestimonial } from "@/types/course";

export function CourseTestimonialsManager({ courseId }: { courseId: string }) {
  const [testimonials, setTestimonials] = useState<CourseTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    listTestimonialsByCourse(courseId)
      .then(setTestimonials)
      .finally(() => setLoading(false));
  }

  useEffect(load, [courseId]);

  function startEdit(t: CourseTestimonial) {
    setEditingId(t.id);
    setEditName(t.student_name);
    setEditPhoto(t.student_photo);
    setEditText(t.testimonial);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateTestimonial(editingId, {
        student_name: editName,
        student_photo: editPhoto,
        testimonial: editText,
      });
      setEditingId(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim() || !newText.trim()) return;
    setSaving(true);
    try {
      const nextOrder =
        testimonials.length > 0 ? Math.max(...testimonials.map((t) => t.order_number)) + 1 : 1;
      await createTestimonial({
        course_id: courseId,
        student_name: newName.trim(),
        student_photo: newPhoto,
        testimonial: newText.trim(),
        order_number: nextOrder,
      });
      setNewName("");
      setNewPhoto(null);
      setNewText("");
      setShowAddForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteTestimonial(id);
    load();
  }

  return (
    <div className="admin-form-card" style={{ maxWidth: 720 }}>
      <h2 style={{ marginBottom: "var(--space-4)" }}>Testimonials</h2>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="admin-table-wrap" style={{ marginBottom: "var(--space-6)" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Student</th>
                <th>Testimonial</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {testimonials.map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.student_photo ? (
                      <img
                        src={t.student_photo}
                        alt={t.student_name}
                        style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{t.student_name}</td>
                  <td style={{ maxWidth: 240 }}>{t.testimonial.slice(0, 80)}</td>
                  <td>
                    <button type="button" className="admin-link" onClick={() => startEdit(t)}>
                      Edit
                    </button>
                    <ConfirmDeleteButton onConfirm={() => handleDelete(t.id)} />
                  </td>
                </tr>
              ))}
              {testimonials.length === 0 && (
                <tr>
                  <td colSpan={4}>No testimonials added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingId && (
        <div className="admin-form-card" style={{ background: "var(--paper)", marginBottom: "var(--space-6)" }}>
          <h3 style={{ marginBottom: "var(--space-4)" }}>Edit Testimonial</h3>
          <TextField label="Student Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <FileUploadField
            label="Student Photo"
            bucket="testimonial-photos"
            value={editPhoto}
            onChange={setEditPhoto}
            returnMode="url"
            accept="image/*"
          />
          <div className="field">
            <label className="field__label">Testimonial</label>
            <textarea
              className="field__input"
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
          </div>
          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="button" onClick={saveEdit} disabled={saving}>
              {saving ? "Saving…" : "Save Testimonial"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showAddForm ? (
        <div className="admin-form-card" style={{ background: "var(--paper)" }}>
          <h3 style={{ marginBottom: "var(--space-4)" }}>New Testimonial</h3>
          <TextField label="Student Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <FileUploadField
            label="Student Photo (optional)"
            bucket="testimonial-photos"
            value={newPhoto}
            onChange={setNewPhoto}
            returnMode="url"
            accept="image/*"
          />
          <div className="field">
            <label className="field__label">Testimonial</label>
            <textarea
              className="field__input"
              rows={3}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
            />
          </div>
          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="button" onClick={handleAdd} disabled={saving || !newName.trim() || !newText.trim()}>
              {saving ? "Adding…" : "Add Testimonial"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setShowAddForm(true)}>
          + Add Testimonial
        </Button>
      )}
    </div>
  );
}
