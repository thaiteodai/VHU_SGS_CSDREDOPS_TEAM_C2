import dotenv from "dotenv";
dotenv.config();

function bool(v: string | undefined, fallback = false) {
  if (v === undefined) return fallback;
  return v === "true" || v === "1";
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  appUrl: process.env.APP_URL ?? "http://localhost:5173",

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "",
  accessTtlSeconds: Number(process.env.ACCESS_TTL_SECONDS ?? 900),
  refreshTtlSeconds: Number(process.env.REFRESH_TTL_SECONDS ?? 7 * 24 * 60 * 60),
  refreshTtlRememberSeconds: Number(process.env.REFRESH_TTL_REMEMBER_SECONDS ?? 30 * 24 * 60 * 60),

  cookieName: process.env.COOKIE_NAME ?? "pp_session",
  cookieSecure: bool(process.env.COOKIE_SECURE, false),

  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.EMAIL_FROM ?? "Panic Plan <no-reply@panicplan.local>",
  },

  sentryDsn: process.env.SENTRY_DSN ?? "",
  tidecloak: {
    issuer: process.env.TIDECLOAK_ISSUER ?? "",
    authorizationEndpoint: process.env.TIDECLOAK_AUTHORIZATION_ENDPOINT ?? "",
    tokenEndpoint: process.env.TIDECLOAK_TOKEN_ENDPOINT ?? "",
    userinfoEndpoint: process.env.TIDECLOAK_USERINFO_ENDPOINT ?? "",
    jwksUri: process.env.TIDECLOAK_JWKS_URI ?? "",
    clientId: process.env.TIDECLOAK_CLIENT_ID ?? "",
    clientSecret: process.env.TIDECLOAK_CLIENT_SECRET ?? "",
    redirectUri: process.env.TIDECLOAK_REDIRECT_URI ?? "",
    audience: process.env.TIDECLOAK_AUDIENCE ?? "",
  },

  meme: {
    baseUrl: process.env.MEME_API_URL ?? "https://api.memegen.link",
    cacheTtlMs: Number(process.env.MEME_CACHE_TTL_MS ?? 6 * 60 * 60 * 1000),
    enabled: bool(process.env.MEME_ENABLED, true),
  },

  backupDir: process.env.BACKUP_DIR ?? "./backups",
};
