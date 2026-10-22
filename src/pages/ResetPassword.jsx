import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { Button, FieldError } from "../components/ui.jsx";
import { passwordRule } from "../lib/validation.js";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    const parsed = passwordRule.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">
          <span aria-hidden="true" />
          NEW PASSWORD
        </span>
        <h1>Reset password</h1>

        {done ? (
          <>
            <p className="auth-sub">Password updated. You are now less forgetful.</p>
            <Link className="button dark full-width" to="/login">
              Sign in
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="stacked-form">
            {!token ? (
              <div className="notice error" role="alert">
                This link is missing its token. Request a new one.
              </div>
            ) : null}
            <label className="field">
              <span>New password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "err-newpass" : undefined}
              />
              <FieldError id="err-newpass">{error}</FieldError>
            </label>
            <Button type="submit" loading={busy} className="full-width" disabled={!token}>
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
