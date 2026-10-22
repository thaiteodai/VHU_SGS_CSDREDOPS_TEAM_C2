import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { Button, FieldError } from "../components/ui.jsx";
import { feedbackSchema, fieldErrors } from "../lib/validation.js";

export default function FeedbackPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setFormError("");
    const parsed = feedbackSchema.safeParse({ message });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await api.post("/users/feedback", { message: parsed.data.message, email });
      setSent(true);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">
          <span aria-hidden="true" />
          FEEDBACK
        </span>
        <h1>Tell us what you think</h1>
        <p className="auth-sub">
          Bug reports, roast quality complaints, and general abuse are all
          welcome. We read everything.
        </p>

        {sent ? (
          <>
            <p className="auth-sub">Received. Thank you. We will not ignore it.</p>
            <Link className="button dark full-width" to="/">
              Back to your targets
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="stacked-form">
            {!user ? (
              <label className="field">
                <span>Email (optional, for a reply)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
            ) : null}
            <label className="field">
              <span>Your message</span>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? "err-msg" : undefined}
              />
              <FieldError id="err-msg">{errors.message}</FieldError>
            </label>
            {formError ? (
              <div className="notice error" role="alert">
                {formError}
              </div>
            ) : null}
            <Button type="submit" loading={busy} className="full-width">
              Send feedback
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
