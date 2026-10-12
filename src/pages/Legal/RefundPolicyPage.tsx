import { Seo } from "@/components/Seo";
import { BUSINESS } from "@/config/site";
import { LAUNCH_WHATSAPP_URL } from "@/content/launch";
import "./legal.css";

// TODO(launch): refund terms are NOT published until you approve them. Edit
// DRAFT below, then set APPROVED = true. The page then shows your terms and
// becomes indexable. Until then it shows only "contact us" and is noindex.
const APPROVED = false;

// Sensible starting point — edit before approving.
const DRAFT: { heading: string; body: string }[] = [
  {
    heading: "Free demo class",
    body: "The demo class is free. There's nothing to refund and no payment is taken.",
  },
  {
    heading: "Before the batch starts",
    body: "If you change your mind before the first class of your batch, message us and we'll refund the full course fee.",
  },
  {
    heading: "After the first class",
    body: "If the course isn't right for you, tell us within 48 hours of the first class and we'll refund the full fee. After that, fees are not refundable, but you can ask to move to a later batch once.",
  },
  {
    heading: "If we cancel or reschedule",
    body: "If we cancel a batch, you get a full refund or a seat in the next batch — your choice.",
  },
  {
    heading: "How refunds are paid",
    body: "Refunds go back to the original payment method through Razorpay, usually within 5–7 working days of approval.",
  },
];

export default function RefundPolicyPage() {
  return (
    <article className="section container legal">
      <Seo
        title="Refund Policy"
        description="CADseekho's refund policy for live online courses."
        canonical="/refund-policy"
        noindex={!APPROVED}
      />
      <h1>Refund Policy</h1>
      {APPROVED ? (
        DRAFT.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            <p>{s.body}</p>
          </section>
        ))
      ) : (
        <p>
          For refund questions, please contact us before or after you pay — email{" "}
          <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>, call{" "}
          <a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>, or{" "}
          <a href={LAUNCH_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            WhatsApp us
          </a>
          . We'll reply within one working day.
        </p>
      )}
    </article>
  );
}
