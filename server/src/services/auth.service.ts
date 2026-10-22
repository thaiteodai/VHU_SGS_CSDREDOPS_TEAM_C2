import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../db.js";
import { config } from "../config.js";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
}

export function signAccessToken(user: TokenPayload): string {
  return jwt.sign(
    { sub: user.sub, email: user.email, role: user.role, name: user.name },
    config.jwtAccessSecret,
    { expiresIn: config.accessTtlSeconds },
  );
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwtAccessSecret) as TokenPayload;
  } catch {
    return null;
  }
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function createRefreshToken(userId: string, rememberMe: boolean): Promise<string> {
  const raw = crypto.randomBytes(48).toString("hex");
  const ttl = rememberMe ? config.refreshTtlRememberSeconds : config.refreshTtlSeconds;
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(raw),
      rememberMe,
      expiresAt: new Date(Date.now() + ttl * 1000),
    },
  });
  return raw;
}

export async function rotateRefreshToken(raw: string) {
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!record || record.revokedAt || record.expiresAt < new Date()) return null;
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || user.deletedAt) return null;
  const refreshToken = await createRefreshToken(user.id, record.rememberMe);
  return { user, refreshToken, rememberMe: record.rememberMe };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  return raw;
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  return raw;
}

export async function consumeEmailVerification(raw: string): Promise<boolean> {
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return false;
  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
  ]);
  return true;
}

export async function consumePasswordReset(raw: string, newPassword: string): Promise<boolean> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return false;
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revokedAt: new Date() } }),
  ]);
  return true;
}
