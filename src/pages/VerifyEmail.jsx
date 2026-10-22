import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState(token ? "working" : "missing");

  useEffect(() => {
    if (!token) return;
    let active = true;
    api
      .post("/auth/verify-email", { token })
      .then(() => active && setStatus("ok"))
      .catch((err) => active && setStatus(err.message));
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">
          <span aria-hidden="true" />
          EMAIL CONFIRMATION
        </span>

        {status === "working" ? (
          <>
            <h1>Checking your link…</h1>
            <p className="auth-sub">One moment while we confirm you are who you say you are.</p>
          </>
        ) : null}

        {status === "ok" ? (
          <>
            <h1>Email confirmed</h1>
            <p className="auth-sub">You are officially a member. The deadlines begin now.</p>
            <Link className="button dark full-width" to="/login">
              Sign in
            </Link>
          </>
        ) : null}

        {status === "missing" ? (
          <>
            <h1>That link is incomplete</h1>
            <p className="auth-sub">Open the confirmation link straight from your email.</p>
            <Link className="button dark full-width" to="/login">
              Go to sign in
            </Link>
          </>
        ) : null}

        {status !== "working" && status !== "ok" && status !== "missing" ? (
          <>
            <h1>That did not work</h1>
            <p className="auth-sub">{status}</p>
            <Link className="button outline full-width" to="/register">
              Try again
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
