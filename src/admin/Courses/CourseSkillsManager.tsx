import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { createSkill, deleteSkill, listSkillsByCourse } from "@/services/admin/adminSkillService";
import type { CourseSkill } from "@/types/course";

export function CourseSkillsManager({ courseId }: { courseId: string }) {
  const [skills, setSkills] = useState<CourseSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    listSkillsByCourse(courseId)
      .then(setSkills)
      .finally(() => setLoading(false));
  }

  useEffect(load, [courseId]);

  async function handleAdd() {
    if (!newSkill.trim()) return;
    setSaving(true);
    try {
      await createSkill(courseId, newSkill.trim());
      setNewSkill("");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteSkill(id);
    load();
  }

  return (
    <div className="admin-form-card" style={{ maxWidth: 720 }}>
      <h2 style={{ marginBottom: "var(--space-4)" }}>Skills You Will Gain</h2>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="skill-tags" style={{ marginBottom: "var(--space-6)" }}>
          {skills.length === 0 && <p>No skills added yet.</p>}
          {skills.map((s) => (
            <span key={s.id} className="skill-tag">
              {s.skill_name}{" "}
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                aria-label={`Remove ${s.skill_name}`}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)" }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <TextField label="New Skill" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
        </div>
        <Button type="button" variant="outline" onClick={handleAdd} disabled={saving || !newSkill.trim()}>
          + Add
        </Button>
      </div>
    </div>
  );
}
