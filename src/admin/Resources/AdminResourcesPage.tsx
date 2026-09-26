import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { FormMessage } from "@/components/ui/FormMessage";
import { ConfirmDeleteButton } from "@/admin/components/ConfirmDeleteButton";
import { ResourcesAdminTabs } from "./ResourcesAdminTabs";
import {
  deleteResource,
  listAllResources,
  setResourceStatus,
  type AdminResourceRow,
} from "@/services/admin/adminResourceService";
import { formatDate } from "@/utils/formatDate";
import {
  RESOURCE_ACCESSES,
  RESOURCE_ACCESS_LABELS,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
} from "@/types/resource";

export default function AdminResourcesPage() {
  const [rows, setRows] = useState<AdminResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [access, setAccess] = useState("");

  function load() {
    setLoading(true);
    listAllResources()
      .then(setRows)
      .catch(() => setError("Couldn't load resources."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!q || r.title.toLowerCase().includes(q) || r.slug.includes(q)) &&
        (!status || r.status === status) &&
        (!type || r.type === type) &&
        (!access || r.access === access)
    );
  }, [rows, search, status, type, access]);

  async function togglePublish(r: AdminResourceRow) {
    setError(null);
    try {
      await setResourceStatus(r.id, r.status === "published" ? "draft" : "published");
      load();
    } catch {
      setError("Couldn't change the status.");
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteResource(id);
      load();
    } catch {
      setError("Couldn't delete this resource.");
    }
  }

  const published = rows.filter((r) => r.status === "published").length;

  return (
    <div>
      <div className="admin-page-header">
        <h1>Resources</h1>
        <Link to="/admin/resources/new" className="btn btn--primary">
          + New resource
        </Link>
      </div>

      <ResourcesAdminTabs />

      {error && <FormMessage type="error">{error}</FormMessage>}

      <p className="admin-muted" style={{ marginBottom: "var(--space-4)" }}>
        {rows.length} resources · {published} published · {rows.length - published} drafts
      </p>

      <div className="admin-toolbar">
        <TextField label="Search" placeholder="Title or slug" value={search} onChange={(e) => setSearch(e.target.value)} />
        <SelectField
          label="Status"
          options={[
            { value: "", label: "All" },
            { value: "published", label: "Published" },
            { value: "draft", label: "Draft" },
          ]}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        <SelectField
          label="Type"
          options={[{ value: "", label: "All" }, ...RESOURCE_TYPES.map((t) => ({ value: t, label: RESOURCE_TYPE_LABELS[t] }))]}
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
        <SelectField
          label="Access"
          options={[
            { value: "", label: "All" },
            ...RESOURCE_ACCESSES.map((a) => ({ value: a, label: RESOURCE_ACCESS_LABELS[a] })),
          ]}
          value={access}
          onChange={(e) => setAccess(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Software</th>
                <th>Access</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/admin/resources/${r.id}`} style={{ fontWeight: 600 }}>
                      {r.title}
                    </Link>
                    <div className="admin-muted">/resources/{r.slug}</div>
                  </td>
                  <td>{RESOURCE_TYPE_LABELS[r.type]}</td>
                  <td>{r.software.map((s) => s.short_name).join(", ") || "—"}</td>
                  <td>{RESOURCE_ACCESS_LABELS[r.access]}</td>
                  <td>
                    <span className={`admin-badge ${r.status === "published" ? "admin-badge--on" : ""}`}>
                      {r.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(r.updated_at)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <Link to={`/admin/resources/${r.id}`} className="admin-link">
                      Edit
                    </Link>
                    <a href={`/resources/${r.slug}`} target="_blank" rel="noreferrer" className="admin-link">
                      View
                    </a>
                    <button type="button" className="admin-link" onClick={() => togglePublish(r)}>
                      {r.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                    <ConfirmDeleteButton
                      onConfirm={() => handleDelete(r.id)}
                      confirmMessage={`Delete “${r.title}”? Its tags, relations, locked content and stats go with it. This can't be undone.`}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>{rows.length === 0 ? "No resources yet. Create the first one." : "No resources match."}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
