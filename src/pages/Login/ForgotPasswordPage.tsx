import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { FormMessage } from "@/components/ui/FormMessage";
import { requestPasswordReset } from "@/services/authService";
import "@/styles/forms.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
    } catch {
      // Intentionally ignored: always show the same message so the form
      // can't be used to enumerate registered emails.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="auth-page__brand">
        CADseekho
      </Link>
      <div className="auth-card">
        <span className="mono-label auth-card__eyebrow">RESET PASSWORD</span>
        <h1 className="auth-card__title">Forgot your password?</h1>
        <p className="auth-card__subtitle">
          Enter the email on your account and we'll send you a reset link.
        </p>

        {sent ? (
          <FormMessage type="success">
            If an account exists for {email}, a password reset link has been sent.
          </FormMessage>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" block disabled={submitting}>
              {submitting ? "Sending…" : "Send Reset Link"}
            </Button>
          </form>
        )}

        <p className="auth-card__footer">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
