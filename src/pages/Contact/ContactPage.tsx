import { useState, type FormEvent } from "react";
import { Seo } from "@/components/Seo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { submitContactMessage } from "@/services/contactService";
import { BUSINESS, SERVICE_AREAS, whatsappLink } from "@/config/site";
import "@/styles/cards.css";
import "./contact.css";

interface FormState {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const initialState: FormState = { name: "", email: "", phone: "", subject: "", message: "" };

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus("idle");
    try {
      await submitContactMessage(form);
      setStatus("success");
      setForm(initialState);
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section container contact-page">
      <Seo
        title="Contact CADseekho – ANSYS & CAD Training, Delhi NCR"
        description="Contact CADseekho about ANSYS, FEA and CAD courses: live online and classroom batches for Delhi NCR. Call, email or send us a message."
        breadcrumbs={[{ name: "Contact", path: "/contact" }]}
      />
      <SectionHeading
        title="Contact CADseekho"
        subtitle="Questions about a course or a resource? Send us a message and we'll get back to you."
        align="center"
        as="h1"
      />

      <div className="contact-details">
        <a href={`mailto:${BUSINESS.email}`} className="contact-details__item">
          <span className="mono-label">Email</span>
          {BUSINESS.email}
        </a>
        <a href={`tel:${BUSINESS.phone}`} className="contact-details__item">
          <span className="mono-label">Phone</span>
          {BUSINESS.phoneDisplay}
        </a>
        {whatsappLink() && (
          <a href={whatsappLink()!} className="contact-details__item" target="_blank" rel="noopener noreferrer">
            <span className="mono-label">WhatsApp</span>
            Message us
          </a>
        )}
        {BUSINESS.address && (
          <span className="contact-details__item">
            <span className="mono-label">Classroom</span>
            {BUSINESS.address.street}, {BUSINESS.address.locality}, {BUSINESS.address.region}{" "}
            {BUSINESS.address.postalCode}
          </span>
        )}
      </div>
      <p className="contact-areas">
        Live online batches for learners anywhere, and classroom batches in Delhi NCR. Serving{" "}
        {SERVICE_AREAS.join(", ")}.
      </p>
      {BUSINESS.address?.mapEmbedUrl && (
        <iframe
          className="contact-map"
          src={BUSINESS.address.mapEmbedUrl}
          title={`${BUSINESS.name} on Google Maps`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}

      <div className="contact-card drafting-frame">
        {status === "success" && (
          <FormMessage type="success">
            Thanks for reaching out — we've received your message and will get back to you soon.
          </FormMessage>
        )}
        {status === "error" && (
          <FormMessage type="error">Something went wrong sending your message. Please try again.</FormMessage>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <TextField
            label="Name"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
          <TextField
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
          <TextField
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
          <TextField
            label="Subject"
            required
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
          />
          <div className="field">
            <label className="field__label" htmlFor="contact-message">
              Message
            </label>
            <textarea
              id="contact-message"
              className="field__input"
              rows={6}
              required
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send Message"}
          </Button>
        </form>
      </div>
    </section>
  );
}
