import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeTideCloakLogin } from "../lib/tidecloak.js";
import { useAuth } from "../lib/auth.jsx";
import { setAccessToken } from "../lib/api.js";
import { Button } from "../components/ui.jsx";

/**
 * TideCloak redirect target in hybrid mode. The SDK sends the browser here
 * with an authorization code; we hand it to our backend, which does the code
 * exchange and sets the session cookie.
 */
export default function CallbackPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await completeTideCloakLogin();
        if (!active) return;
        setAccessToken(data.accessToken);
        await refresh();
        navigate("/", { replace: true });
      } catch (err) {
        if (active) setError(err.message);
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate, refresh]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">
          <span aria-hidden="true" />
          TIDECLOAK
        </span>
        {error ? (
          <>
            <h1>Sign-in failed</h1>
            <p className="auth-sub">{error}</p>
            <Button className="full-width" onClick={() => navigate("/login")}>
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <h1>Finishing sign-in…</h1>
            <p className="auth-sub">Talking to TideCloak. One moment.</p>
            <div className="progress-bar" aria-hidden="true">
              <span />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
