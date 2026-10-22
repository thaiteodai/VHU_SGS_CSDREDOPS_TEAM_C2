import { prisma } from "../db.js";

export async function logAudit(
  actorId: string | null,
  actorName: string,
  action: string,
  reason: string,
): Promise<void> {
  try {
    await prisma.auditEvent.create({ data: { actorId, actorName, action, reason } });
  } catch (err) {
    console.error("audit log failed", err);
  }
}

export async function trackEvent(
  name: string,
  opts: { userId?: string | null; path?: string | null; meta?: unknown } = {},
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name,
        userId: opts.userId ?? null,
        path: opts.path ?? null,
        meta: opts.meta === undefined ? null : JSON.stringify(opts.meta),
      },
    });
  } catch (err) {
    console.error("analytics failed", err);
  }
}
