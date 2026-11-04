import { useEffect, useState } from "react";
import { getMyPurchases, type Purchase } from "@/services/lessonService";

const formatAmount = (p: Purchase) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: p.currency, maximumFractionDigits: 2 }).format(p.amountPaise / 100);
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Paid Razorpay orders (public.my_purchases). No invoice generator exists yet, so no invoice link. */
export function PurchasesTab() {
  const [rows, setRows] = useState<Purchase[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getMyPurchases()
      .then(setRows)
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="section__status">Couldn't load your purchases. Please try again later.</p>;
  if (rows === null) return <p className="section__status">Loading…</p>;
  if (rows.length === 0) return <p className="section__status">No purchases yet.</p>;

  return (
    <>
      <ul className="dashboard-list">
        {rows.map((p) => (
          <li key={p.orderId} className="dashboard-list__item">
            <div>
              <span className="mono-label">{formatDate(p.paidAt)}</span>
              <p className="dashboard-list__title">{p.courseTitle}</p>
              <p className="dashboard-list__schedule">
                Order {p.orderId}
                {p.paymentId ? ` · Payment ${p.paymentId}` : ""}
              </p>
            </div>
            <div className="dashboard-list__meta">
              <strong>{formatAmount(p)}</strong>
            </div>
          </li>
        ))}
      </ul>
      <p className="dashboard-list__schedule" style={{ marginTop: "var(--space-4)" }}>
        Need a GST invoice? <a href="/contact">Contact us</a> with your order id.
      </p>
    </>
  );
}
