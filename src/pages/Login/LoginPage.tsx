import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { FormMessage } from "@/components/ui/FormMessage";
import { signIn } from "@/services/authService";
import "@/styles/forms.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch {
      // Never surface raw Supabase/Postgres errors to the user (Section 30).
      setError("Incorrect email or password. Please try again.");
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
        <span className="mono-label auth-card__eyebrow">SIGN IN</span>
        <h1 className="auth-card__title">Welcome back</h1>
        <p className="auth-card__subtitle">Log in to access your dashboard and downloads.</p>

        <form onSubmit={handleSubmit} noValidate>
          {error && <FormMessage type="error">{error}</FormMessage>}

          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div style={{ textAlign: "right", marginTop: "-0.5rem" }}>
            <Link to="/forgot-password" style={{ fontSize: "0.875rem", color: "var(--accent)" }}>
              Forgot password?
            </Link>
          </div>

          <Button type="submit" block disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <p className="auth-card__footer">
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
