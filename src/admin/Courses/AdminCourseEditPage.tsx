import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { FileUploadField } from "@/admin/components/FileUploadField";
import { RichTextEditor } from "@/admin/components/RichTextEditor";
import { CourseModulesManager } from "./CourseModulesManager";
import { CourseSkillsManager } from "./CourseSkillsManager";
import { CourseFaqsManager } from "./CourseFaqsManager";
import { CourseTestimonialsManager } from "./CourseTestimonialsManager";
import { listAllCategories } from "@/services/admin/adminCategoryService";
import {
  createCourse,
  getCourseById,
  updateCourse,
  type CourseInput,
} from "@/services/admin/adminCourseService";
import type { Category } from "@/types/category";
import type { CourseFormat, CourseLevel } from "@/types/course";

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const FORMAT_OPTIONS = [
  { value: "self_paced", label: "Self-Paced, Online" },
  { value: "live", label: "Live, Instructor-Led" },
];

type CourseFormState = Omit<CourseInput, "price" | "original_price"> & {
  price: string;
  original_price: string;
};

const emptyForm: CourseFormState = {
  category_id: "",
  title: "",
  slug: "",
  short_description: "",
  description: "",
  level: null,
  software: "",
  prerequisites: "",
  image: "",
  format: "self_paced",
  price: "",
  original_price: "",
  next_batch_date: null,
  is_featured: false,
  is_published: false,
};

export default function AdminCourseEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CourseFormState>(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAllCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew || !id) return;
    getCourseById(id)
      .then((c) => {
        if (!c) {
          setError("Course not found.");
          return;
        }
        setForm({
          category_id: c.category_id,
          title: c.title,
          slug: c.slug,
          short_description: c.short_description ?? "",
          description: c.description ?? "",
          level: c.level,
          software: c.software ?? "",
          prerequisites: c.prerequisites ?? "",
          image: c.image ?? "",
          format: c.format,
          price: c.price != null ? String(c.price) : "",
          original_price: c.original_price != null ? String(c.original_price) : "",
          next_batch_date: c.next_batch_date,
          is_featured: c.is_featured,
          is_published: c.is_published,
        });
      })
      .catch(() => setError("Couldn't load this course."))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: CourseInput = {
        ...form,
        price: form.price.trim() === "" ? null : Number(form.price),
        original_price: form.original_price.trim() === "" ? null : Number(form.original_price),
      };
      if (isNew) {
        const created = await createCourse(payload);
        navigate(`/admin/courses/${created.id}`, { replace: true });
      } else if (id) {
        await updateCourse(id, payload);
      }
    } catch {
      setError("Couldn't save this course. The slug may already be in use.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <div className="admin-page-header">
        <h1>{isNew ? "New Course" : "Edit Course"}</h1>
        <Link to="/admin/courses" className="admin-link">
          ← Back to Courses
        </Link>
      </div>

      {error && <FormMessage type="error">{error}</FormMessage>}

      <form className="admin-form-card" onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
        <div className="admin-form-row">
          <TextField
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <TextField
            label="Slug"
            required
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
        </div>

        <SelectField
          label="Category"
          placeholder="Select a category"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          value={form.category_id}
          onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
        />

        <TextField
          label="Short Description"
          value={form.short_description ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
        />

        <div className="field">
          <label className="field__label">Full Description</label>
          <RichTextEditor
            value={form.description ?? ""}
            onChange={(html) => setForm((f) => ({ ...f, description: html }))}
          />
        </div>

        <div className="admin-form-row">
          <SelectField
            label="Level"
            placeholder="Select a level"
            options={LEVEL_OPTIONS}
            value={form.level ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as CourseLevel }))}
          />
          <TextField
            label="Software"
            value={form.software ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, software: e.target.value }))}
          />
        </div>

        <div className="admin-form-row">
          <SelectField
            label="Format"
            options={FORMAT_OPTIONS}
            value={form.format}
            onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as CourseFormat }))}
          />
          <TextField
            label="Next Batch Starts"
            type="date"
            value={form.next_batch_date ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, next_batch_date: e.target.value || null }))}
          />
        </div>

        <TextField
          label="Prerequisites"
          value={form.prerequisites ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, prerequisites: e.target.value }))}
        />

        <div className="admin-form-row">
          <TextField
            label="Price (₹)"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 1999"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
          <TextField
            label="Original Price (₹)"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 3998 — shown struck through"
            value={form.original_price}
            onChange={(e) => setForm((f) => ({ ...f, original_price: e.target.value }))}
          />
        </div>

        <FileUploadField
          label="Course Image"
          bucket="course-images"
          value={form.image}
          onChange={(url) => setForm((f) => ({ ...f, image: url }))}
          returnMode="url"
          accept="image/*"
        />

        <label className="admin-checkbox-row">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
          />
          Featured on homepage
        </label>
        <label className="admin-checkbox-row">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
          />
          Published (visible on the site)
        </label>

        <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Course"}
          </Button>
        </div>
      </form>

      {!isNew && id && (
        <>
          <CourseModulesManager courseId={id} />
          <CourseSkillsManager courseId={id} />
          <CourseFaqsManager courseId={id} />
          <CourseTestimonialsManager courseId={id} />
        </>
      )}
    </div>
  );
}
