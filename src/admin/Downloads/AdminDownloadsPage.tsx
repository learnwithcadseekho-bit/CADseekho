import { useEffect, useState, type FormEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { ConfirmDeleteButton } from "@/admin/components/ConfirmDeleteButton";
import { FileUploadField } from "@/admin/components/FileUploadField";
import {
  createDownload,
  deleteDownload,
  listAllDownloads,
  updateDownload,
  uploadDownloadFile,
  type DownloadInput,
} from "@/services/admin/adminDownloadService";
import { formatFileSize } from "@/utils/formatFileSize";
import type { Download } from "@/types/download";

const emptyForm: DownloadInput = {
  title: "",
  slug: "",
  description: "",
  category: "",
  file_path: "",
  file_type: "",
  file_size: null,
  thumbnail: "",
  requires_login: true,
  is_published: true,
};

export default function AdminDownloadsPage() {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DownloadInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  function load() {
    setLoading(true);
    listAllDownloads()
      .then(setDownloads)
      .catch(() => setError("Couldn't load downloads."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(d: Download) {
    setEditingId(d.id);
    setForm({
      title: d.title,
      slug: d.slug,
      description: d.description ?? "",
      category: d.category ?? "",
      file_path: d.file_path,
      file_type: d.file_type ?? "",
      file_size: d.file_size,
      thumbnail: d.thumbnail ?? "",
      requires_login: d.requires_login,
      is_published: d.is_published,
    });
    setShowForm(true);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setError(null);
    try {
      const result = await uploadDownloadFile(file, form.requires_login);
      setForm((f) => ({ ...f, ...result }));
    } catch {
      setError("File upload failed.");
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.file_path) {
      setError("Please upload a file before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateDownload(editingId, form);
      } else {
        await createDownload(form);
      }
      setShowForm(false);
      load();
    } catch {
      setError("Couldn't save this resource. The slug may already be in use.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDownload(id);
      load();
    } catch {
      setError("Couldn't delete this resource.");
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Downloads</h1>
        <Button onClick={startCreate}>+ New Resource</Button>
      </div>

      {error && <FormMessage type="error">{error}</FormMessage>}

      {showForm && (
        <form className="admin-form-card" onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
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
          <TextField
            label="Description"
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <TextField
            label="Category"
            value={form.category ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />

          <label className="admin-checkbox-row">
            <input
              type="checkbox"
              checked={form.requires_login}
              onChange={(e) => setForm((f) => ({ ...f, requires_login: e.target.checked }))}
            />
            Requires login to download
          </label>

          <div className="field">
            <label className="field__label">Resource File</label>
            <input type="file" onChange={handleFileChange} disabled={uploadingFile} />
            {uploadingFile && <p className="admin-hint">Uploading…</p>}
            {form.file_path && !uploadingFile && (
              <p className="admin-hint">
                {form.file_path} · {form.file_type} · {formatFileSize(form.file_size)}
              </p>
            )}
          </div>

          <FileUploadField
            label="Thumbnail (optional)"
            bucket="downloads-public"
            value={form.thumbnail}
            onChange={(url) => setForm((f) => ({ ...f, thumbnail: url }))}
            returnMode="url"
            accept="image/*"
          />

          <label className="admin-checkbox-row">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
            />
            Published (visible on the site)
          </label>

          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="submit" disabled={saving || uploadingFile}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Create Resource"}
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
                <th>Type</th>
                <th>Size</th>
                <th>Login</th>
                <th>Downloads</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {downloads.map((d) => (
                <tr key={d.id}>
                  <td>{d.title}</td>
                  <td>{d.category ?? "—"}</td>
                  <td>{d.file_type ?? "—"}</td>
                  <td>{formatFileSize(d.file_size)}</td>
                  <td>{d.requires_login ? "Required" : "Public"}</td>
                  <td>{d.download_count}</td>
                  <td>
                    <span className={`admin-badge ${d.is_published ? "admin-badge--on" : ""}`}>
                      {d.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="admin-link" onClick={() => startEdit(d)}>
                      Edit
                    </button>
                    <ConfirmDeleteButton onConfirm={() => handleDelete(d.id)} />
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
