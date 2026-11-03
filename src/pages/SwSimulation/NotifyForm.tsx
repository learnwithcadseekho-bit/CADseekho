import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { FormMessage } from "@/components/ui/FormMessage";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { submitNotifyLead, type NotifyLeadInput } from "@/services/leadService";
import { trackCustom, trackLead } from "@/lib/track";
import { INTEREST_OPTIONS } from "@/content/swSimulation";
// Same rules as the Edge Function.
import { NOTIFY_CONSENT_TEXT, normaliseIndianMobile } from "../../../supabase/functions/submit-lead/lead.ts";

type Interest = NotifyLeadInput["interest"];
type Errors = Partial<Record<keyof NotifyLeadInput, string>>;

function check(f: NotifyLeadInput): Errors {
  const e: Errors = {};
  const name = f.name.trim();
  if (name.length < 2 || name.length > 60) e.name = "Please enter your name (2–60 characters).";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = "Please enter a valid email address.";
  if (!normaliseIndianMobile(f.phone)) e.phone = "Enter a 10-digit Indian WhatsApp number.";
  if (!f.interest) e.interest = "Please choose one.";
  if (!f.consent) e.consent = "Please tick this so we can tell you when it opens.";
  return e;
}

/**
 * "Notify me" / founding-batch waitlist. `interest` is controlled by the page
 * so a pricing card's waitlist button can preselect its level.
 */
export function NotifyForm({ interest, onInterestChange }: { interest: Interest; onInterestChange: (v: Interest) => void }) {
  const [form, setForm] = useState<Omit<NotifyLeadInput, "interest">>({
    name: "",
    email: "",
    phone: "",
    org: "",
    consent: false,
    website: "",
    turnstileToken: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [waitingForCheck, setWaitingForCheck] = useState(false);
  const [done, setDone] = useState(false);
  // Turnstile loads on first interaction, not with the page.
  const [touched, setTouched] = useState(false);
  const [widgetKey, setWidgetKey] = useState(0);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const latest = useRef({ ...form, interest });
  latest.current = { ...form, interest };

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function send(data: NotifyLeadInput) {
    setSubmitting(true);
    setServerError(null);
    try {
      await submitNotifyLead(data);
      trackCustom("sw_sim_notify_submit", { interest: data.interest });
      trackLead({
        name: "SOLIDWORKS Simulation waitlist",
        method: "sw_sim_notify",
        email: data.email.trim(),
        phone: normaliseIndianMobile(data.phone) ?? undefined,
      });
      setDone(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
      // Tokens are single-use: a fresh challenge for the retry.
      setForm((f) => ({ ...f, turnstileToken: "" }));
      setWidgetKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    const data = { ...form, interest };
    const found = check(data);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (!form.turnstileToken) {
      setWaitingForCheck(true); // submit as soon as the check passes
      return;
    }
    send(data);
  }

  function onVerify(token: string) {
    setForm((f) => ({ ...f, turnstileToken: token }));
    if (waitingForCheck) {
      setWaitingForCheck(false);
      send({ ...latest.current, turnstileToken: token });
    }
  }

  if (done) {
    return (
      <div className="sws-notify__done" role="status">
        <h3>You're on the list.</h3>
        <p>
          We'll WhatsApp and email you when enrollment opens. Meanwhile, Module 0 and Module 1 are free —{" "}
          <Link to="/signup">create a free account</Link> to start.
        </p>
      </div>
    );
  }

  const busy = submitting || waitingForCheck;

  return (
    <form className="demo-form sws-notify__form" onSubmit={handleSubmit} onFocusCapture={() => setTouched(true)} noValidate>
      {serverError && <FormMessage type="error">{serverError}</FormMessage>}

      <TextField
        id="notify-name"
        label="Name *"
        autoComplete="name"
        maxLength={60}
        value={form.name}
        error={errors.name}
        onChange={(e) => update("name", e.target.value)}
      />
      <div className="demo-form__pair">
        <TextField
          id="notify-email"
          label="Email *"
          type="email"
          autoComplete="email"
          value={form.email}
          error={errors.email}
          onChange={(e) => update("email", e.target.value)}
        />
        <TextField
          id="notify-phone"
          label="WhatsApp number *"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="98765 43210"
          value={form.phone}
          error={errors.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
      </div>
      <TextField
        id="notify-org"
        label="Company (optional)"
        autoComplete="organization"
        maxLength={100}
        value={form.org}
        onChange={(e) => update("org", e.target.value)}
      />
      <SelectField
        id="notify-interest"
        label="Which level interests you? *"
        placeholder="Choose one"
        options={INTEREST_OPTIONS}
        value={interest}
        error={errors.interest}
        onChange={(e) => {
          onInterestChange(e.target.value as Interest);
          if (errors.interest) setErrors((x) => ({ ...x, interest: undefined }));
        }}
      />

      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div className="demo-form__hp" aria-hidden="true">
        <label htmlFor="notify-website">Website</label>
        <input
          id="notify-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => update("website", e.target.value)}
        />
      </div>

      <div className="field">
        <label className="demo-form__consent">
          <input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} />
          <span>
            {NOTIFY_CONSENT_TEXT}. See our{" "}
            <Link to="/privacy-policy" target="_blank">
              privacy policy
            </Link>
            .
          </span>
        </label>
        {errors.consent && <p className="field__error">{errors.consent}</p>}
      </div>

      {touched && siteKey && (
        <TurnstileWidget
          key={widgetKey}
          siteKey={siteKey}
          onVerify={onVerify}
          onExpire={() => setForm((f) => ({ ...f, turnstileToken: "" }))}
        />
      )}

      <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
        {submitting ? "Sending…" : waitingForCheck ? "Checking you're human…" : "Notify me"}
      </button>
    </form>
  );
}
