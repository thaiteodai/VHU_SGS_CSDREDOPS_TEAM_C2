import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { track } from "../lib/analytics.js";
import { Button, FieldError } from "../components/ui.jsx";
import { registerSchema, fieldErrors } from "../lib/validation.js";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showOnWall, setShowOnWall] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setFormError("");
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await register(parsed.data.email, parsed.data.password, parsed.data.name, showOnWall);
      track("signup");
      setDone(true);
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <span className="eyebrow">
            <span aria-hidden="true" />
            ALMOST THERE
          </span>
          <h1>Check your email</h1>
          <p className="auth-sub">
            We sent a confirmation link to <b>{form.email}</b>. Open it to finish
            setting up. The link lasts 24 hours.
          </p>
          <p className="muted">
            No email? In development the link is printed in the server console.
          </p>
          <Button className="full-width" onClick={() => navigate("/login")}>
            Go to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">
          <span aria-hidden="true" />
          NEW MEMBER
        </span>
        <h1>Create your account</h1>
        <p className="auth-sub">First target is free. Roasting is included.</p>

        <form onSubmit={submit} className="stacked-form" noValidate>
          <label className="field">
            <span>What should we call you?</span>
            <input
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "err-name" : undefined}
            />
            <FieldError id="err-name">{errors.name}</FieldError>
          </label>

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
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "err-password" : "password-hint"}
            />
            <FieldError id="err-password">{errors.password}</FieldError>
            {!errors.password ? (
              <span className="field-hint" id="password-hint">
                At least 8 characters, with a letter and a number.
              </span>
            ) : null}
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={showOnWall}
              onChange={(e) => setShowOnWall(e.target.checked)}
            />
            Put my overdue targets on the Wall of Shame
          </label>

          {formError ? (
            <div className="notice error" role="alert">
              {formError}
            </div>
          ) : null}

          <Button type="submit" loading={busy} className="full-width">
            Create account
          </Button>
        </form>

        <p className="auth-foot">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
