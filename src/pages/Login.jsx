import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { startTideCloakLogin } from "../lib/tidecloak.js";
import { track } from "../lib/analytics.js";
import { Button, FieldError } from "../components/ui.jsx";
import { loginSchema, fieldErrors } from "../lib/validation.js";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tcBusy, setTcBusy] = useState(false);

  const from = location.state?.from ?? "/";

  async function submit(event) {
    event.preventDefault();
    setFormError("");
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await login(parsed.data.email, parsed.data.password, rememberMe);
      track("login");
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function tidecloakLogin() {
    setFormError("");
    setTcBusy(true);
    try {
      await startTideCloakLogin(from);
    } catch (err) {
      setFormError(err.message);
      setTcBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">
          <span aria-hidden="true" />
          WELCOME BACK
        </span>
        <h1>Sign in</h1>
        <p className="auth-sub">Your deadlines have been patiently judging you.</p>

        <form onSubmit={submit} className="stacked-form" noValidate>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "err-email" : undefined}
            />
            <FieldError id="err-email">{errors.email}</FieldError>
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "err-password" : undefined}
            />
            <FieldError id="err-password">{errors.password}</FieldError>
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Keep me signed in for 30 days
          </label>

          {formError ? (
            <div className="notice error" role="alert">
              {formError}
            </div>
          ) : null}

          <Button type="submit" loading={busy} className="full-width">
            Sign in
          </Button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <Button variant="outline" className="full-width" onClick={tidecloakLogin} loading={tcBusy}>
          Continue with TideCloak
        </Button>

        <p className="auth-foot">
          No account? <Link to="/register">Create one</Link> ·{" "}
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
      </div>
    </div>
  );
}
