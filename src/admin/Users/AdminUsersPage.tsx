import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listAllUsers, setUserRole } from "@/services/admin/adminUserService";
import { formatDate } from "@/utils/formatDate";
import type { Profile } from "@/types/profile";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listAllUsers()
      .then(setUsers)
      .catch(() => setError("Couldn't load users."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggleRole(u: Profile) {
    const nextRole = u.role === "admin" ? "user" : "admin";
    if (!window.confirm(`Make ${u.full_name || u.email} ${nextRole === "admin" ? "an admin" : "a regular user"}?`)) {
      return;
    }
    try {
      await setUserRole(u.id, nextRole);
      load();
    } catch {
      setError("Couldn't update this user's role.");
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Users</h1>
      </div>

      {error && <p className="field__error">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Type</th>
                <th>Experience</th>
                <th>Joined</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name || "—"}</td>
                  <td>{u.email}</td>
                  <td>{u.user_type}</td>
                  <td>{u.experience ?? "—"}</td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>
                    <span className={`admin-badge ${u.role === "admin" ? "admin-badge--on" : ""}`}>{u.role}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-link"
                      onClick={() => toggleRole(u)}
                      disabled={u.id === currentUser?.id}
                      title={u.id === currentUser?.id ? "You can't change your own role" : undefined}
                    >
                      {u.role === "admin" ? "Revoke Admin" : "Make Admin"}
                    </button>
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
