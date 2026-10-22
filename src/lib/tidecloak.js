import { useEffect, useState } from "react";
import { IAMService } from "@tidecloak/js";

/**
 * TideCloak in hybrid (BFF) mode.
 *
 * The SDK never receives a token. It generates a PKCE verifier, redirects the
 * browser to TideCloak, and on the callback hands the authorization code to
 * our own backend, which performs the code exchange and sets an httpOnly
 * session cookie.
 *
 * The endpoints come from the server at runtime, so there is nothing to keep
 * in sync by hand and no client secret in the browser.
 */

let loaded = false;
let loadPromise = null;

export async function loadTideCloakConfig() {
  if (loaded) return true;
  if (!loadPromise) {
    loadPromise = fetch("/api/auth/tidecloak/config", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Could not read the sign-in configuration.");
        return res.json();
      })
      .then(async (config) => {
        if (!config?.enabled || !config.oidc?.authorizationEndpoint) {
          loaded = false;
          return false;
        }
        await IAMService.loadConfig(config);
        loaded = true;
        return true;
      })
      .catch(() => false);
  }
  return loadPromise;
}

export async function startTideCloakLogin(returnUrl = "/") {
  const ok = await loadTideCloakConfig();
  if (!ok) throw new Error("TideCloak sign-in is not configured on this server.");
  await IAMService.doLogin(returnUrl);
}

/** True when the current URL is a TideCloak callback with a code. */
export function isTideCloakCallback() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("code");
}

/**
 * Used by the callback route: hands the code + verifier to our backend.
 */
export async function completeTideCloakLogin() {
  const data = IAMService.getHybridCallbackData({ clearStorage: false });
  if (!data?.isCallback || !data.code || !data.verifier) {
    throw new Error("That sign-in link is incomplete. Try again.");
  }
  const res = await fetch("/api/auth/tidecloak", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: JSON.stringify({
        code: data.code,
        code_verifier: data.verifier,
        redirect_uri: data.redirectUri,
      }),
      provider: data.provider,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "TideCloak sign-in failed.");
  }
  return res.json();
}

/** React hook wrapper so components can render the right loading state. */
export function useTideCloakReady() {
  const [ready, setReady] = useState(loaded);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    loadTideCloakConfig().then((ok) => {
      if (!active) return;
      setReady(ok);
      setFailed(!ok);
    });
    return () => {
      active = false;
    };
  }, []);

  return { ready, failed };
}
