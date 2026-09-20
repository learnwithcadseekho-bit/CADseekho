import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ConfirmDeleteButton } from "@/admin/components/ConfirmDeleteButton";
import { createFaq, deleteFaq, listFaqsByCourse, updateFaq } from "@/services/admin/adminFaqService";
import type { CourseFaq } from "@/types/course";

export function CourseFaqsManager({ courseId }: { courseId: string }) {
  const [faqs, setFaqs] = useState<CourseFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    listFaqsByCourse(courseId)
      .then(setFaqs)
      .finally(() => setLoading(false));
  }

  useEffect(load, [courseId]);

  function startEdit(f: CourseFaq) {
    setEditingId(f.id);
    setEditQuestion(f.question);
    setEditAnswer(f.answer);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateFaq(editingId, { question: editQuestion, answer: editAnswer });
      setEditingId(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setSaving(true);
    try {
      const nextOrder = faqs.length > 0 ? Math.max(...faqs.map((f) => f.order_number)) + 1 : 1;
      await createFaq({
        course_id: courseId,
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        order_number: nextOrder,
      });
      setNewQuestion("");
      setNewAnswer("");
      setShowAddForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteFaq(id);
    load();
  }

  return (
    <div className="admin-form-card" style={{ maxWidth: 720 }}>
      <h2 style={{ marginBottom: "var(--space-4)" }}>FAQ</h2>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="admin-table-wrap" style={{ marginBottom: "var(--space-6)" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Answer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {faqs.map((f) => (
                <tr key={f.id}>
                  <td>{f.question}</td>
                  <td style={{ maxWidth: 240 }}>{f.answer.slice(0, 80)}</td>
                  <td>
                    <button type="button" className="admin-link" onClick={() => startEdit(f)}>
                      Edit
                    </button>
                    <ConfirmDeleteButton onConfirm={() => handleDelete(f.id)} />
                  </td>
                </tr>
              ))}
              {faqs.length === 0 && (
                <tr>
                  <td colSpan={3}>No FAQs added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingId && (
        <div className="admin-form-card" style={{ background: "var(--paper)", marginBottom: "var(--space-6)" }}>
          <h3 style={{ marginBottom: "var(--space-4)" }}>Edit FAQ</h3>
          <TextField label="Question" value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} />
          <div className="field">
            <label className="field__label">Answer</label>
            <textarea
              className="field__input"
              rows={3}
              value={editAnswer}
              onChange={(e) => setEditAnswer(e.target.value)}
            />
          </div>
          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="button" onClick={saveEdit} disabled={saving}>
              {saving ? "Saving…" : "Save FAQ"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showAddForm ? (
        <div className="admin-form-card" style={{ background: "var(--paper)" }}>
          <h3 style={{ marginBottom: "var(--space-4)" }}>New FAQ</h3>
          <TextField label="Question" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
          <div className="field">
            <label className="field__label">Answer</label>
            <textarea
              className="field__input"
              rows={3}
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
            />
          </div>
          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="button" onClick={handleAdd} disabled={saving || !newQuestion.trim() || !newAnswer.trim()}>
              {saving ? "Adding…" : "Add FAQ"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setShowAddForm(true)}>
          + Add FAQ
        </Button>
      )}
    </div>
  );
}
