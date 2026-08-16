import { useEffect, useState, type FormEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { ConfirmDeleteButton } from "@/admin/components/ConfirmDeleteButton";
import { FileUploadField } from "@/admin/components/FileUploadField";
import { useAuth } from "@/hooks/useAuth";
import {
  createPost,
  deletePost,
  listAllPosts,
  updatePost,
  type BlogPostInput,
} from "@/services/admin/adminBlogService";
import { formatDate } from "@/utils/formatDate";
import type { BlogPost } from "@/types/blogPost";

const CATEGORY_OPTIONS = [
  "SolidWorks",
  "AutoCAD",
  "ANSYS",
  "GD&T",
  "DFM",
  "CAD Tips",
  "Engineering",
  "Career",
  "Tutorials",
].map((c) => ({ value: c, label: c }));

const emptyForm: BlogPostInput = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featured_image: "",
  category: "",
  is_published: false,
  published_at: null,
};

export default function AdminBlogPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogPostInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    listAllPosts()
      .then(setPosts)
      .catch(() => setError("Couldn't load blog posts."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(p: BlogPost) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? "",
      content: p.content ?? "",
      featured_image: p.featured_image ?? "",
      category: p.category ?? "",
      is_published: p.is_published,
      published_at: p.published_at,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const payload: BlogPostInput = {
        ...form,
        published_at: form.is_published ? form.published_at ?? new Date().toISOString() : form.published_at,
      };
      if (editingId) {
        await updatePost(editingId, payload);
      } else {
        await createPost(payload, user.id);
      }
      setShowForm(false);
      load();
    } catch {
      setError("Couldn't save this post. The slug may already be in use.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePost(id);
      load();
    } catch {
      setError("Couldn't delete this post.");
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Blog</h1>
        <Button onClick={startCreate}>+ New Post</Button>
      </div>

      {error && <FormMessage type="error">{error}</FormMessage>}

      {showForm && (
        <form className="admin-form-card" onSubmit={handleSubmit} style={{ maxWidth: 680 }}>
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
            options={CATEGORY_OPTIONS}
            value={form.category ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <TextField
            label="Excerpt"
            value={form.excerpt ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
          />
          <div className="field">
            <label className="field__label">Content (paragraphs separated by a blank line)</label>
            <textarea
              className="field__input"
              rows={10}
              value={form.content ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
          <FileUploadField
            label="Featured Image"
            bucket="blog-images"
            value={form.featured_image}
            onChange={(url) => setForm((f) => ({ ...f, featured_image: url }))}
            returnMode="url"
            accept="image/*"
          />
          <label className="admin-checkbox-row">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
            />
            Published
          </label>

          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Create Post"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Published</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>{p.category ?? "—"}</td>
                  <td>{p.published_at ? formatDate(p.published_at) : "—"}</td>
                  <td>
                    <span className={`admin-badge ${p.is_published ? "admin-badge--on" : ""}`}>
                      {p.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="admin-link" onClick={() => startEdit(p)}>
                      Edit
                    </button>
                    <ConfirmDeleteButton onConfirm={() => handleDelete(p.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
