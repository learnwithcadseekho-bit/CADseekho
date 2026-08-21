import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { FormMessage } from "@/components/ui/FormMessage";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { signUp } from "@/services/authService";
import {
  EXPERIENCE_OPTIONS,
  INTERESTED_COURSE_OPTIONS,
  USER_TYPE_OPTIONS,
  type ExperienceLevel,
  type InterestedCourseSlug,
  type UserType,
} from "@/types/profile";
import "@/styles/forms.css";

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  userType: UserType | "";
  experience: ExperienceLevel | "";
  interestedCourses: InterestedCourseSlug[];
}

const initialState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  userType: "",
  experience: "",
  interestedCourses: [],
};

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) errors.fullName = "Full name is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email address.";
    if (!form.phone.trim()) errors.phone = "Mobile number is required.";
    if (form.password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords do not match.";
    if (!form.userType) errors.userType = "Select what best describes you.";
    if (!form.experience) errors.experience = "Select your experience level.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    if (!turnstileToken) {
      setError("Please complete the verification check below.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp(
        {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          userType: form.userType as UserType,
          experience: form.experience as ExperienceLevel,
          interestedCourses: form.interestedCourses,
        },
        turnstileToken
      );

      if (result.session) {
        navigate("/dashboard", { replace: true });
      } else {
        // Email confirmation is required before a session is issued.
        setCheckEmail(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't create your account. Please try again.");
      setTurnstileToken(null);
      setTurnstileResetKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="auth-page">
        <Link to="/" className="auth-page__brand">
          CADseekho
        </Link>
        <div className="auth-card">
          <span className="mono-label auth-card__eyebrow">ALMOST THERE</span>
          <h1 className="auth-card__title">Check your email</h1>
          <FormMessage type="success">
            We've sent a confirmation link to {form.email}. Confirm your address to activate your
            account, then sign in.
          </FormMessage>
          <p className="auth-card__footer">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <Link to="/" className="auth-page__brand">
        CADseekho
      </Link>
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <span className="mono-label auth-card__eyebrow">CREATE ACCOUNT</span>
        <h1 className="auth-card__title">Join CADseekho</h1>
        <p className="auth-card__subtitle">
          Create an account to register for courses and access free downloads.
        </p>

        <GoogleSignInButton />
        <div className="auth-divider">or</div>

        <form onSubmit={handleSubmit} noValidate>
          {error && <FormMessage type="error">{error}</FormMessage>}

          <TextField
            label="Full Name"
            required
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            error={fieldErrors.fullName}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            error={fieldErrors.email}
          />
          <TextField
            label="Mobile Number"
            type="tel"
            required
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            error={fieldErrors.phone}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            error={fieldErrors.password}
          />
          <TextField
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            error={fieldErrors.confirmPassword}
          />
          <SelectField
            label="I am a"
            placeholder="Select one"
            options={USER_TYPE_OPTIONS}
            value={form.userType}
            onChange={(e) => update("userType", e.target.value as UserType)}
            error={fieldErrors.userType}
          />
          <SelectField
            label="Experience"
            placeholder="Select one"
            options={EXPERIENCE_OPTIONS}
            value={form.experience}
            onChange={(e) => update("experience", e.target.value as ExperienceLevel)}
            error={fieldErrors.experience}
          />
          <CheckboxGroup
            label="Interested Courses (optional)"
            options={INTERESTED_COURSE_OPTIONS}
            value={form.interestedCourses}
            onChange={(value) => update("interestedCourses", value as InterestedCourseSlug[])}
          />

          <div className="field">
            <TurnstileWidget
              key={turnstileResetKey}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onVerify={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
            />
          </div>

          <Button type="submit" block disabled={submitting || !turnstileToken}>
            {submitting ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        <p className="auth-card__footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
