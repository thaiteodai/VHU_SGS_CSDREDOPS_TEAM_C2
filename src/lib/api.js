/**
 * API client.
 *
 * The access token lives in memory only. The refresh token is an httpOnly
 * cookie the browser sends automatically, so a stolen disk cannot be replayed
 * as a session. On a 401 we silently refresh once and retry.
 */

let accessToken = null;
let refreshInFlight = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

async function parse(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.fields = data?.fields;
    throw err;
  }
  return data;
}

async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Session expired");
        const data = await res.json();
        accessToken = data.accessToken;
        return data;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function request(path, { method = "GET", body, retry = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && retry && path !== "/auth/refresh" && path !== "/auth/login") {
    try {
      await refreshSession();
      return request(path, { method, body, retry: false });
    } catch {
      clearAccessToken();
      window.dispatchEvent(new CustomEvent("pp:session-expired"));
    }
  }
  return parse(res);
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: body ?? {} }),
  patch: (path, body) => request(path, { method: "PATCH", body: body ?? {} }),
  del: (path) => request(path, { method: "DELETE" }),
};
