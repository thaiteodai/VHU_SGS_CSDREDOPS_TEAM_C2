import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Button } from "../components/ui.jsx";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
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
          PASSWORD RESCUE
        </span>
        <h1>Forgot password</h1>

        {sent ? (
          <>
            <p className="auth-sub">
              If that email has an account, a reset link is on its way. It expires
              in one hour.
            </p>
            <Link className="button dark full-width" to="/login">
              Back to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="stacked-form">
            <p className="auth-sub">We will email you a link to set a new one.</p>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {error ? (
              <div className="notice error" role="alert">
                {error}
              </div>
            ) : null}
            <Button type="submit" loading={busy} className="full-width">
              Send reset link
            </Button>
          </form>
        )}

        <p className="auth-foot">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
