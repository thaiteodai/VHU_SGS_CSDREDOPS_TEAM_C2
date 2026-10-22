import { config } from "../config.js";
import { prisma } from "../db.js";

/**
 * TideCloak integration (hybrid / BFF mode).
 *
 * The browser never receives a TideCloak token. The SDK posts the
 * authorization code + PKCE verifier to /api/authenticate, and this module
 * performs the code exchange server-side, then mints our own session.
 */

export interface TidecloakProfile {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
}

export function isConfigured(): boolean {
  const t = config.tidecloak;
  return Boolean(t.tokenEndpoint && t.clientId);
}

export function publicConfig() {
  const t = config.tidecloak;
  return {
    authorizationEndpoint: t.authorizationEndpoint,
    clientId: t.clientId,
    redirectUri: t.redirectUri,
    issuer: t.issuer,
    audience: t.audience,
    enabled: isConfigured(),
  };
}

export async function exchangeCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const t = config.tidecloak;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    code_verifier: params.codeVerifier,
    redirect_uri: params.redirectUri || t.redirectUri,
    client_id: t.clientId,
  });
  if (t.clientSecret) body.set("client_secret", t.clientSecret);

  const res = await fetch(t.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TideCloak token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function fetchProfile(accessToken: string): Promise<TidecloakProfile> {
  const t = config.tidecloak;
  if (!t.userinfoEndpoint) throw new Error("TIDECLOAK_USERINFO_ENDPOINT is not configured");

  const res = await fetch(t.userinfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`TideCloak userinfo failed (${res.status})`);

  const raw = (await res.json()) as Record<string, unknown>;
  const sub = String(raw.sub ?? "");
  const email = String(raw.email ?? raw.preferred_username ?? "");
  if (!sub || !email) throw new Error("TideCloak profile is missing sub or email");

  return {
    sub,
    email,
    name: String(raw.name ?? raw.preferred_username ?? email.split("@")[0]),
    emailVerified: raw.email_verified === true || raw.email_verified === "true",
  };
}

/**
 * Links a TideCloak identity to a local account, creating one when needed.
 * An existing local account with the same email is claimed rather than
 * duplicated, so signing in with TideCloak and with a password converge.
 */
export async function upsertUserFromProfile(profile: TidecloakProfile) {
  const bySub = await prisma.user.findUnique({ where: { tidecloakSub: profile.sub } });
  if (bySub) {
    return prisma.user.update({
      where: { id: bySub.id },
      data: { emailVerified: bySub.emailVerified || profile.emailVerified, tidecloakSub: profile.sub },
    });
  }

  const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { tidecloakSub: profile.sub, emailVerified: byEmail.emailVerified || profile.emailVerified },
    });
  }

  return prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      role: "MEMBER",
      emailVerified: profile.emailVerified,
      tidecloakSub: profile.sub,
    },
  });
}
