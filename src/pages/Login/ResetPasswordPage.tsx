import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { FormMessage } from "@/components/ui/FormMessage";
import { updatePassword } from "@/services/authService";
import "@/styles/forms.css";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      navigate("/dashboard", { replace: true });
    } catch {
      setError("This reset link is invalid or has expired. Request a new one.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="auth-page__brand">
        CADseekho
      </Link>
      <div className="auth-card">
        <span className="mono-label auth-card__eyebrow">RESET PASSWORD</span>
        <h1 className="auth-card__title">Choose a new password</h1>

        <form onSubmit={handleSubmit} noValidate>
          {error && <FormMessage type="error">{error}</FormMessage>}

          <TextField
            label="New Password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <TextField
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <Button type="submit" block disabled={submitting}>
            {submitting ? "Saving…" : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
