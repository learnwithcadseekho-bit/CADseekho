import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { FormMessage } from "@/components/ui/FormMessage";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { submitDemoLead, setPendingLead, type DemoLeadInput } from "@/services/leadService";
import { newEventId } from "@/lib/track";
import { LAUNCH, LAUNCH_WHATSAPP_URL, istDay, istTime } from "@/content/launch";
// One source of truth for the rules, shared with the Edge Function.
import { CAD_OPTIONS, CONSENT_TEXT, ROLES, normaliseIndianMobile } from "../../../supabase/functions/submit-lead/lead.ts";

const ROLE_OPTIONS = Object.entries(ROLES).map(([value, label]) => ({ value, label }));
const CAD_CHOICES = CAD_OPTIONS.map((c) => ({ value: c, label: c }));

const EMPTY: DemoLeadInput = {
  name: "",
  phone: "",
  email: "",
  role: "",
  org: "",
  city: "",
  cad: [],
  consent: false,
  website: "",
  turnstileToken: "",
};

type Errors = Partial<Record<keyof DemoLeadInput, string>>;

function check(f: DemoLeadInput): Errors {
  const e: Errors = {};
  const name = f.name.trim();
  if (name.length < 2 || name.length > 60) e.name = "Please enter your name (2–60 characters).";
  if (!normaliseIndianMobile(f.phone)) e.phone = "Enter a 10-digit Indian mobile number.";
  if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = "Check the email, or leave it blank.";
  if (!f.role) e.role = "Please choose one.";
  if (!f.consent) e.consent = "Please tick this so we can send you the demo link.";
  return e;
}

/** The demo booking form, inline on the landing page. Only Name, WhatsApp and role are shown up front. */
export function DemoForm({ idPrefix }: { idPrefix: string }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<DemoLeadInput>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Turnstile loads on first interaction, not with the page (keeps the landing page fast).
  const [touched, setTouched] = useState(false);
  const [widgetKey, setWidgetKey] = useState(0);
  const [waitingForCheck, setWaitingForCheck] = useState(false);
  // Optional fields (email, college, city, CAD) start folded away.
  const [moreOpen, setMoreOpen] = useState(false);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const formRef = useRef(form);
  formRef.current = form;

  function update<K extends keyof DemoLeadInput>(key: K, value: DemoLeadInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function send(data: DemoLeadInput) {
    setSubmitting(true);
    setServerError(null);
    try {
      await submitDemoLead(data);
      const phone = normaliseIndianMobile(data.phone) ?? undefined;
      setPendingLead({ eventId: newEventId("lead"), email: data.email.trim() || undefined, phone });
      navigate("/thank-you?lead=1");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
      // Tokens are single-use: a fresh challenge for the retry.
      setForm((f) => ({ ...f, turnstileToken: "" }));
      setWidgetKey((k) => k + 1);
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    const found = check(form);
    setErrors(found);
    if (found.email) setMoreOpen(true); // the only optional field that can be wrong
    if (Object.keys(found).length > 0) return;
    if (!form.turnstileToken) {
      // The check is still running — submit as soon as it passes.
      setWaitingForCheck(true);
      return;
    }
    send(form);
  }

  function onVerify(token: string) {
    const next = { ...formRef.current, turnstileToken: token };
    setForm(next);
    if (waitingForCheck) {
      setWaitingForCheck(false);
      send(next);
    }
  }

  const busy = submitting || waitingForCheck;

  return (
    <form className="demo-form" onSubmit={handleSubmit} onFocusCapture={() => setTouched(true)} noValidate>
      {serverError && (
        <FormMessage type="error">
          {serverError}{" "}
          <a href={LAUNCH_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            Book on WhatsApp instead →
          </a>
        </FormMessage>
      )}

      <TextField
        id={`${idPrefix}-name`}
        label="Name *"
        autoComplete="name"
        maxLength={60}
        value={form.name}
        error={errors.name}
        onChange={(e) => update("name", e.target.value)}
      />
      <TextField
        id={`${idPrefix}-phone`}
        label="WhatsApp number *"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="98765 43210"
        value={form.phone}
        error={errors.phone}
        onChange={(e) => update("phone", e.target.value)}
      />
      <SelectField
        id={`${idPrefix}-role`}
        label="I am a *"
        placeholder="Choose one"
        options={ROLE_OPTIONS}
        value={form.role}
        error={errors.role}
        onChange={(e) => update("role", e.target.value as DemoLeadInput["role"])}
      />
      <details className="demo-form__more" open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
        <summary>More details (optional)</summary>
        <TextField
          id={`${idPrefix}-email`}
          label="Email (optional)"
          type="email"
          autoComplete="email"
          value={form.email}
          error={errors.email}
          onChange={(e) => update("email", e.target.value)}
        />
        <div className="demo-form__pair">
          <TextField
            id={`${idPrefix}-org`}
            label="College or company"
            autoComplete="organization"
            maxLength={100}
            value={form.org}
            onChange={(e) => update("org", e.target.value)}
          />
          <TextField
            id={`${idPrefix}-city`}
            label="City"
            autoComplete="address-level2"
            maxLength={60}
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </div>
        <CheckboxGroup label="CAD you know" options={CAD_CHOICES} value={form.cad} onChange={(v) => update("cad", v)} />
      </details>

      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div className="demo-form__hp" aria-hidden="true">
        <label htmlFor={`${idPrefix}-website`}>Website</label>
        <input
          id={`${idPrefix}-website`}
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
            {CONSENT_TEXT}. See our{" "}
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
        {submitting ? "Booking…" : waitingForCheck ? "Checking you're human…" : "Book My Free Seat"}
      </button>
      <p className="demo-form__note">Free · {istDay(LAUNCH.demoStart)}, {istTime(LAUNCH.demoStart)} IST on Zoom · No payment needed</p>
    </form>
  );
}
