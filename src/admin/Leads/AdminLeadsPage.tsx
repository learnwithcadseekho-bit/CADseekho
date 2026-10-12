import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  LEAD_STATUSES,
  listLeads,
  updateLead,
  type Lead,
  type LeadFilters,
  type LeadPatch,
} from "@/services/admin/adminLeadService";

const ROLE_LABEL: Record<Lead["role"], string> = { student: "Student", working_engineer: "Working engineer", other: "Other" };
const STATUS_LABEL: Record<Lead["status"], string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  not_interested: "Not interested",
  paid: "Paid",
};

const istDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function utmSummary(l: Lead): string {
  return [l.utm.utm_source, l.utm.utm_campaign, l.utm.utm_content].filter(Boolean).join(" / ");
}

function toCsv(leads: Lead[]): string {
  const cols: [string, (l: Lead) => unknown][] = [
    ["Created (IST)", (l) => istDateTime(l.created_at)],
    ["Name", (l) => l.name],
    ["Phone", (l) => l.phone],
    ["Email", (l) => l.email],
    ["Role", (l) => ROLE_LABEL[l.role]],
    ["Org", (l) => l.org],
    ["City", (l) => l.city],
    ["CAD", (l) => l.cad.join(", ")],
    ["Source", (l) => l.source],
    ["UTM source", (l) => l.utm.utm_source],
    ["UTM medium", (l) => l.utm.utm_medium],
    ["UTM campaign", (l) => l.utm.utm_campaign],
    ["UTM content", (l) => l.utm.utm_content],
    ["UTM term", (l) => l.utm.utm_term],
    ["gclid", (l) => l.gclid],
    ["fbclid", (l) => l.fbclid],
    ["Status", (l) => STATUS_LABEL[l.status]],
    ["Bookings", (l) => l.submissions],
    ["Demo booked", (l) => (l.demo_booked ? "Yes" : "No")],
    ["Attended", (l) => (l.attended ? "Yes" : "No")],
    ["Paid", (l) => (l.paid ? "Yes" : "No")],
    ["Notes", (l) => l.notes],
    ["Consent", (l) => `${l.consent_text} (${istDateTime(l.consent_at)})`],
    ["Lead ID", (l) => l.id],
  ];
  const cell = (v: unknown) => {
    let s = v == null ? "" : String(v);
    // Stop spreadsheet apps running a typed value as a formula (phone numbers are safe).
    if (/^[=+\-@]/.test(s) && !/^\+91\d{10}$/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map(([h]) => h).join(","), ...leads.map((l) => cols.map(([, f]) => cell(f(l))).join(","))].join("\r\n");
}

export default function AdminLeadsPage() {
  const [filters, setFilters] = useState<LeadFilters>({ from: "", to: "", source: "", status: "" });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listLeads(filters)
      .then(setLeads)
      .catch(() => setError("Couldn't load leads."))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(load, [load]);

  const sources = useMemo(() => [...new Set(["website", ...leads.map((l) => l.source)])], [leads]);
  const totals = useMemo(
    () => ({
      all: leads.length,
      attended: leads.filter((l) => l.attended).length,
      paid: leads.filter((l) => l.paid).length,
    }),
    [leads]
  );

  async function patch(id: string, change: LeadPatch) {
    const before = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...change } : l)));
    try {
      await updateLead(id, change);
    } catch {
      setLeads(before);
      setError("Couldn't save that change — try again.");
    }
  }

  function exportCsv() {
    // BOM so Excel opens UTF-8 names correctly.
    const blob = new Blob(["﻿" + toCsv(leads)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cadseekho-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const set = (k: keyof LeadFilters) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="admin-page-header">
        <h1>Demo Leads</h1>
        <button type="button" className="btn btn--outline btn--sm" onClick={exportCsv} disabled={leads.length === 0}>
          Export CSV
        </button>
      </div>

      <div className="admin-toolbar">
        <div className="field">
          <label className="field__label" htmlFor="lead-from">
            From
          </label>
          <input id="lead-from" type="date" className="field__input" value={filters.from} onChange={set("from")} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="lead-to">
            To
          </label>
          <input id="lead-to" type="date" className="field__input" value={filters.to} onChange={set("to")} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="lead-source">
            Source
          </label>
          <select id="lead-source" className="field__select" value={filters.source} onChange={set("source")}>
            <option value="">All</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="lead-status">
            Status
          </label>
          <select id="lead-status" className="field__select" value={filters.status} onChange={set("status")}>
            <option value="">All</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="admin-hint">
        {totals.all} leads · {totals.attended} attended · {totals.paid} paid. Paid is ticked automatically when the same
        phone or email completes a Razorpay payment. Times are IST.
      </p>
      {error && <p className="field__error">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : leads.length === 0 ? (
        <p>No leads match these filters.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Booked</th>
                <th>Lead</th>
                <th>Details</th>
                <th>Ad</th>
                <th>Status</th>
                <th>Attended</th>
                <th>Paid</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const where = [l.org, l.city].filter(Boolean).join(", ");
                return (
                  <tr key={l.id}>
                    <td>
                      {istDateTime(l.created_at)}
                      {l.submissions > 1 && <span className="admin-hint"> · booked {l.submissions}×</span>}
                    </td>
                    <td>
                      <strong>{l.name}</strong>
                      <br />
                      <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                        {l.phone}
                      </a>
                      {l.email && (
                        <>
                          <br />
                          <span className="admin-hint">{l.email}</span>
                        </>
                      )}
                    </td>
                    <td>
                      {ROLE_LABEL[l.role]}
                      {where && (
                        <>
                          <br />
                          <span className="admin-hint">{where}</span>
                        </>
                      )}
                      {l.cad.length > 0 && (
                        <>
                          <br />
                          <span className="admin-hint">CAD: {l.cad.join(", ")}</span>
                        </>
                      )}
                    </td>
                    <td className="admin-hint">{utmSummary(l) || l.source}</td>
                    <td>
                      <select
                        className="field__select"
                        aria-label={`Status for ${l.name}`}
                        value={l.status}
                        onChange={(e) => patch(l.id, { status: e.target.value as Lead["status"] })}
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`${l.name} attended`}
                        checked={l.attended}
                        onChange={(e) => patch(l.id, { attended: e.target.checked })}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`${l.name} paid`}
                        checked={l.paid}
                        onChange={(e) => patch(l.id, { paid: e.target.checked })}
                      />
                    </td>
                    <td>
                      <textarea
                        className="field__input"
                        rows={2}
                        aria-label={`Notes for ${l.name}`}
                        defaultValue={l.notes}
                        style={{ minWidth: 180 }}
                        onBlur={(e) => {
                          if (e.target.value !== l.notes) patch(l.id, { notes: e.target.value });
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
