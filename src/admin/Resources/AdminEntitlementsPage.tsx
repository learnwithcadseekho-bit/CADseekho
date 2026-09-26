import { useEffect, useState, type FormEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { ConfirmDeleteButton } from "@/admin/components/ConfirmDeleteButton";
import { ResourcesAdminTabs } from "./ResourcesAdminTabs";
import {
  countEnrolledMembers,
  grantEntitlement,
  listEntitlements,
  revokeEntitlement,
  UserNotFoundError,
  type EntitlementRow,
} from "@/services/admin/adminResourceService";
import { formatDate } from "@/utils/formatDate";

export default function AdminEntitlementsPage() {
  const [rows, setRows] = useState<EntitlementRow[]>([]);
  const [members, setMembers] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [entitlement, setEntitlement] = useState("member");
  const [expires, setExpires] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    listEntitlements().then(setRows).catch(() => setError("Couldn't load access grants."));
  }

  useEffect(() => {
    load();
    countEnrolledMembers().then(setMembers).catch(() => setMembers(null));
  }, []);

  async function handleGrant(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !entitlement.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // End of the chosen day in the admin's timezone.
      const expiresAt = expires ? new Date(`${expires}T23:59:59`).toISOString() : null;
      await grantEntitlement(email, entitlement.trim(), expiresAt);
      setSuccess(`Granted “${entitlement.trim()}” to ${email.trim()}.`);
      setEmail("");
      setExpires("");
      load();
    } catch (err) {
      setError(
        err instanceof UserNotFoundError
          ? `No account uses ${email.trim()}. The student has to sign up first.`
          : "Couldn't grant access. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(id: string) {
    setError(null);
    setSuccess(null);
    try {
      await revokeEntitlement(id);
      load();
    } catch {
      setError("Couldn't revoke this grant.");
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Resources</h1>
      </div>
      <ResourcesAdminTabs />

      <div className="admin-form-card admin-form-card--wide">
        <h2 className="admin-section-title">Who can open locked resources</h2>
        <p style={{ marginBottom: "var(--space-2)" }}>
          Anyone enrolled in <strong>any</strong> course unlocks every resource marked “Anyone enrolled in any course” —
          automatically, no grant needed.
          {members !== null && (
            <>
              {" "}
              Right now that's <strong>{members}</strong> {members === 1 ? "student" : "students"}.
            </>
          )}
        </p>
        <p className="admin-muted">
          Use grants below for everyone else — e.g. a college batch paid offline, a reviewer, or a custom key like
          pack:scf-calculators. Grants with the key <code>member</code> unlock the same as an enrollment.
        </p>
      </div>

      {error && <FormMessage type="error">{error}</FormMessage>}
      {success && <FormMessage type="success">{success}</FormMessage>}

      <form className="admin-form-card admin-form-card--wide" onSubmit={handleGrant}>
        <h2 className="admin-section-title">Grant access</h2>
        <div className="admin-form-row">
          <TextField label="Student's email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            label="Key"
            required
            value={entitlement}
            onChange={(e) => setEntitlement(e.target.value)}
            list="entitlement-suggestions"
          />
          <datalist id="entitlement-suggestions">
            <option value="member" />
          </datalist>
        </div>
        <TextField label="Expires on (optional)" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
          <Button type="submit" disabled={saving}>
            {saving ? "Granting…" : "Grant access"}
          </Button>
        </div>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Key</th>
              <th>Granted</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const expired = r.expires_at !== null && new Date(r.expires_at) < new Date();
              return (
                <tr key={r.id}>
                  <td>
                    {r.full_name ?? "—"}
                    <div className="admin-muted">{r.email ?? r.user_id}</div>
                  </td>
                  <td>
                    <code>{r.entitlement}</code>
                  </td>
                  <td>{formatDate(r.granted_at)}</td>
                  <td>{r.expires_at ? `${formatDate(r.expires_at)}${expired ? " (expired)" : ""}` : "Never"}</td>
                  <td>
                    <ConfirmDeleteButton
                      label="Revoke"
                      onConfirm={() => handleRevoke(r.id)}
                      confirmMessage={`Revoke “${r.entitlement}” from ${r.email ?? "this user"}?`}
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5}>No manual grants yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
