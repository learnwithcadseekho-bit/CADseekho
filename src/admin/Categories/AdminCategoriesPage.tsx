import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { ConfirmDeleteButton } from "@/admin/components/ConfirmDeleteButton";
import {
  createCategory,
  deleteCategory,
  listAllCategories,
  updateCategory,
  type CategoryInput,
} from "@/services/admin/adminCategoryService";
import type { Category } from "@/types/category";

const emptyForm: CategoryInput = {
  name: "",
  slug: "",
  description: "",
  image: "",
  is_active: true,
  sort_order: 0,
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryInput>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    listAllCategories()
      .then(setCategories)
      .catch(() => setError("Couldn't load categories."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? "",
      image: cat.image ?? "",
      is_active: cat.is_active,
      sort_order: cat.sort_order,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await updateCategory(editingId, form);
      } else {
        await createCategory(form);
      }
      setShowForm(false);
      load();
    } catch {
      setError("Couldn't save this category. The slug may already be in use.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCategory(id);
      load();
    } catch {
      setError("Couldn't delete this category — it may still have courses attached.");
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Categories</h1>
        <Button onClick={startCreate}>+ New Category</Button>
      </div>

      {error && <FormMessage type="error">{error}</FormMessage>}

      {showForm && (
        <form className="admin-form-card" onSubmit={handleSubmit}>
          <TextField
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            label="Slug"
            required
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
          <TextField
            label="Description"
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <TextField
            label="Image URL"
            value={form.image ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
          />
          <TextField
            label="Display Order (lower shows first)"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
          />
          <label className="admin-checkbox-row">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active (visible on the site)
          </label>
          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editingId ? "Save Changes" : "Create Category"}
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
                <th>Order</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.sort_order}</td>
                  <td>{cat.name}</td>
                  <td>{cat.slug}</td>
                  <td>
                    <span className={`admin-badge ${cat.is_active ? "admin-badge--on" : ""}`}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="admin-link" onClick={() => startEdit(cat)}>
                      Edit
                    </button>
                    <ConfirmDeleteButton onConfirm={() => handleDelete(cat.id)} />
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
