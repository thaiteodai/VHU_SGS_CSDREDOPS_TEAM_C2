import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { config } from "../config.js";
import * as auth from "../services/auth.service.js";
import * as tidecloak from "../services/tidecloak.service.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/email.service.js";
import { logAudit, trackEvent } from "../services/audit.service.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { registerSchema, loginSchema, forgotSchema, resetSchema, verifySchema } from "../validators/index.js";

const router = Router();

const cookieOpts = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: "lax" as const,
  path: "/",
};

function setSessionCookie(res: import("express").Response, token: string, rememberMe: boolean) {
  const maxAge = (rememberMe ? config.refreshTtlRememberSeconds : config.refreshTtlSeconds) * 1000;
  res.cookie(config.cookieName, token, { ...cookieOpts, maxAge });
}

function publicUser(user: { id: string; email: string; name: string; role: string; emailVerified: boolean }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing && !existing.deletedAt) {
      throw new HttpError(409, "That email already has an account. Try signing in.");
    }

    const passwordHash = await auth.hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        role: "MEMBER",
        showOnWall: body.showOnWall,
      },
    });

    const token = await auth.createEmailVerificationToken(user.id);
    await sendVerificationEmail(user.email, user.name, `${config.appUrl}/verify-email?token=${token}`);
    await logAudit(user.id, user.name, "Account created", `${user.email} signed up.`);
    await trackEvent("signup", { userId: user.id });

    res.status(201).json({ message: "Account created. Check your email to confirm it." });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    if (!user || !user.passwordHash || user.deletedAt) {
      await auth.hashPassword(body.password); // constant-ish work to blunt timing attacks
      throw new HttpError(401, "Email or password is wrong.");
    }
    const ok = await auth.verifyPassword(body.password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Email or password is wrong.");

    if (!user.emailVerified) {
      throw new HttpError(403, "Confirm your email first. Check your inbox for the link.");
    }

    const accessToken = auth.signAccessToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
    const refreshToken = await auth.createRefreshToken(user.id, body.rememberMe);
    setSessionCookie(res, refreshToken, body.rememberMe);

    await logAudit(user.id, user.name, "Signed in", `${user.email} signed in.`);
    await trackEvent("login", { userId: user.id });

    res.json({ accessToken, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const raw = (req.cookies?.[config.cookieName] ?? req.body?.refreshToken) as string | undefined;
    if (!raw) throw new HttpError(401, "No session to refresh.");

    const result = await auth.rotateRefreshToken(raw);
    if (!result) {
      res.clearCookie(config.cookieName, cookieOpts);
      throw new HttpError(401, "Your session expired. Sign in again.");
    }

    const accessToken = auth.signAccessToken({
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
    });
    setSessionCookie(res, result.refreshToken, result.rememberMe);
    res.json({ accessToken, user: publicUser(result.user) });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const raw = (req.cookies?.[config.cookieName] ?? req.body?.refreshToken) as string | undefined;
    if (raw) await auth.revokeRefreshToken(raw);
    res.clearCookie(config.cookieName, cookieOpts);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/verify-email", async (req, res, next) => {
  try {
    const body = verifySchema.parse(req.body);
    const ok = await auth.consumeEmailVerification(body.token);
    if (!ok) throw new HttpError(400, "That confirmation link is invalid or has expired.");
    res.json({ ok: true, message: "Email confirmed. You can sign in now." });
  } catch (err) {
    next(err);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const body = forgotSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (user && !user.deletedAt) {
      const token = await auth.createPasswordResetToken(user.id);
      await sendPasswordResetEmail(user.email, user.name, `${config.appUrl}/reset-password?token=${token}`);
      await trackEvent("password_reset_requested", { userId: user.id });
    }
    // Always the same answer, so this endpoint cannot enumerate accounts.
    res.json({ message: "If that email has an account, a reset link is on its way." });
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const body = resetSchema.parse(req.body);
    const ok = await auth.consumePasswordReset(body.token, body.password);
    if (!ok) throw new HttpError(400, "That reset link is invalid or has expired.");
    res.json({ ok: true, message: "Password updated. Sign in with the new one." });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new HttpError(404, "Account not found.");
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

/**
 * TideCloak hybrid endpoint. The SDK posts the authorization code and PKCE
 * verifier; we do the exchange server-side and mint our own session, so the
 * browser never holds a TideCloak token.
 */
router.post("/tidecloak", async (req, res, next) => {
  try {
    // The @tidecloak/react hybrid SDK posts:
    //   { accessToken: "<json string>", provider: "tidecloak-auth" }
    // where the JSON string is { code, code_verifier, redirect_uri }.
    // We also accept the flattened shape so the endpoint is usable directly.
    const raw = z
      .object({
        code: z.string().optional(),
        codeVerifier: z.string().optional(),
        code_verifier: z.string().optional(),
        redirectUri: z.string().optional(),
        redirect_uri: z.string().optional(),
        accessToken: z.string().optional(),
        provider: z.string().optional(),
      })
      .parse(req.body);

    let code = raw.code;
    let codeVerifier = raw.codeVerifier ?? raw.code_verifier;
    let redirectUri = raw.redirectUri ?? raw.redirect_uri;

    if (raw.accessToken) {
      try {
        const parsed = JSON.parse(raw.accessToken) as Record<string, string>;
        code = code ?? parsed.code;
        codeVerifier = codeVerifier ?? parsed.code_verifier;
        redirectUri = redirectUri ?? parsed.redirect_uri;
      } catch {
        throw new HttpError(400, "The sign-in payload was malformed.");
      }
    }

    if (!code || !codeVerifier) {
      throw new HttpError(400, "The sign-in payload was incomplete. Try again.");
    }

    if (!tidecloak.isConfigured()) {
      throw new HttpError(503, "TideCloak sign-in is not configured on this server right now.");
    }

    const tokens = await tidecloak.exchangeCode({
      code,
      codeVerifier,
      redirectUri: redirectUri ?? "",
    });

    const profile = await tidecloak.fetchProfile(tokens.access_token);
    const user = await tidecloak.upsertUserFromProfile(profile);

    await prisma.tidecloakToken.create({
      data: {
        userId: user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        idToken: tokens.id_token ?? null,
        expiresAt: new Date(Date.now() + (tokens.expires_in ?? 900) * 1000),
      },
    });

    const accessToken = auth.signAccessToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
    const refreshToken = await auth.createRefreshToken(user.id, true);
    setSessionCookie(res, refreshToken, true);

    await logAudit(user.id, user.name, "Signed in with TideCloak", `${user.email} used TideCloak.`);
    await trackEvent("tidecloak_login", { userId: user.id });

    res.json({ accessToken, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

/**
 * The client fetches this and hands it to the TideCloak SDK in hybrid mode.
 * The browser learns the IdP endpoints from us, so no secret ever ships to
 * the client and there is nothing to keep in sync manually.
 */
router.get("/tidecloak/config", (_req, res) => {
  const cfg = tidecloak.publicConfig();
  res.json({
    authMode: "hybrid",
    oidc: {
      authorizationEndpoint: cfg.authorizationEndpoint,
      clientId: cfg.clientId,
      redirectUri: cfg.redirectUri,
      scope: "openid profile email",
    },
    tokenExchange: {
      endpoint: "/api/auth/tidecloak",
      provider: "tidecloak-auth",
    },
    enabled: cfg.enabled,
  });
});

export default router;
