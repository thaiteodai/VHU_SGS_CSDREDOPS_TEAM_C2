import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/auth.service.js";
import { prisma } from "../db.js";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "MEMBER" | "MODERATOR" | "ADMIN";
}

export interface AuthedRequest extends Request {
  user?: SessionUser;
}

/**
 * Requires a valid access token. The token is read from the Authorization
 * header first (used by the API clients and tests) and from the httpOnly
 * cookie second (used by the browser session).
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token = bearer ?? (req.cookies?.[process.env.COOKIE_NAME ?? "pp_session"] as string | undefined);

  if (!token) return res.status(401).json({ error: "Sign in to continue." });

  const payload = verifyAccessToken(token);
  if (!payload?.sub) return res.status(401).json({ error: "Your session expired. Sign in again." });

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.deletedAt) return res.status(401).json({ error: "This account is no longer available." });

  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  next();
}

/**
 * Attaches the user when a valid token is present, but never rejects.
 * Used by endpoints that work for signed-in and signed-out visitors alike.
 */
export async function optionalAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token = bearer ?? (req.cookies?.[process.env.COOKIE_NAME ?? "pp_session"] as string | undefined);
  if (!token) return next();

  const payload = verifyAccessToken(token);
  if (!payload?.sub) return next();

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (user && !user.deletedAt) {
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  }
  next();
}

/**
 * Server-side role gate. The client never decides permissions; it only
 * decides what to render.
 */
export function requireRole(...roles: SessionUser["role"][]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Sign in to continue." });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to do that." });
    }
    next();
  };
}

/**
 * Owner-or-buddy gate for a target. Anything else is a 403, so a stranger
 * learns the resource exists but gets nothing.
 */
export function requireTargetAccess(
  targetId: string,
  userId: string,
  mode: "owner" | "owner-or-buddy" | "read",
): Promise<boolean> {
  return prisma.target
    .findUnique({
      where: { id: targetId },
      include: { buddies: { where: { buddyId: userId, status: "ACCEPTED" } } },
    })
    .then((target) => {
      if (!target) return false;
      if (target.ownerId === userId) return true;
      if (mode === "owner") return false;
      return target.buddies.length > 0;
    });
}
