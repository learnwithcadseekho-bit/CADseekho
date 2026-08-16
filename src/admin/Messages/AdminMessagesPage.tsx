import { useEffect, useState } from "react";
import { ConfirmDeleteButton } from "@/admin/components/ConfirmDeleteButton";
import { deleteMessage, listAllMessages, type ContactMessage } from "@/services/admin/adminContactService";
import { formatDate } from "@/utils/formatDate";

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listAllMessages()
      .then(setMessages)
      .catch(() => setError("Couldn't load messages."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(id: string) {
    try {
      await deleteMessage(id);
      load();
    } catch {
      setError("Couldn't delete this message.");
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Contact Messages</h1>
      </div>

      {error && <p className="field__error">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : messages.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>From</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.name}
                    <br />
                    <span className="admin-hint">
                      {m.email}
                      {m.phone ? ` · ${m.phone}` : ""}
                    </span>
                  </td>
                  <td>{m.subject ?? "—"}</td>
                  <td style={{ maxWidth: 320 }}>{m.message}</td>
                  <td>{formatDate(m.created_at)}</td>
                  <td>
                    <ConfirmDeleteButton onConfirm={() => handleDelete(m.id)} />
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
