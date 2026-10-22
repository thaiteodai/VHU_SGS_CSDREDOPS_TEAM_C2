import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, AuthedRequest, requireRole, optionalAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { hashPassword } from "../services/auth.service.js";
import { logAudit } from "../services/audit.service.js";
import { profileSchema, roleSchema, feedbackSchema } from "../validators/index.js";

const router = Router();

router.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new HttpError(404, "Account not found.");
    const { passwordHash, tidecloakSub, ...safe } = user;
    res.json({
      user: {
        ...safe,
        hasPassword: Boolean(passwordHash),
        linkedToTidecloak: Boolean(tidecloakSub),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.user!.id }, data: body });
    const { passwordHash, tidecloakSub, ...safe } = user;
    res.json({ user: { ...safe, hasPassword: Boolean(passwordHash), linkedToTidecloak: Boolean(tidecloakSub) } });
  } catch (err) {
    next(err);
  }
});

router.post("/me/password", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.passwordHash) throw new HttpError(400, "This account signs in with TideCloak.");
    const bcrypt = (await import("bcrypt")).default;
    if (!(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
      throw new HttpError(401, "Current password is wrong.");
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.newPassword) },
    });
    await logAudit(user.id, user.name, "Password changed", "User changed their own password.");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Full data export - everything we hold about the member. */
router.get("/me/export", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        targets: { include: { steps: true, roasts: true, buddies: true } },
        buddyLinks: { include: { target: true } },
        roasts: true,
        auditEvents: true,
        feedback: true,
        analyticsEvents: true,
      },
    });
    if (!user) throw new HttpError(404, "Account not found.");

    const { passwordHash: _ph, tidecloakSub: _tc, refreshTokens: _rt, tidecloakTokens: _tt, ...safe } = user as any;
    res.setHeader("Content-Disposition", `attachment; filename="panicplan-export-${user.id}.json"`);
    res.json({ exportedAt: new Date().toISOString(), data: safe });
  } catch (err) {
    next(err);
  }
});

/**
 * Delete on request. Personal identifiers are scrubbed immediately; the audit
 * trail keeps only non-identifying rows so the public log stays coherent.
 */
router.delete("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const id = req.user!.id;
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          email: `deleted-${id}@deleted.invalid`,
          name: "Deleted member",
          passwordHash: null,
          showOnWall: false,
        },
      }),
      prisma.refreshToken.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } }),
      prisma.tidecloakToken.deleteMany({ where: { userId: id } }),
      prisma.buddyLink.updateMany({ where: { buddyId: id }, data: { status: "REVOKED" } }),
      prisma.feedback.updateMany({ where: { userId: id }, data: { userId: null } }),
      prisma.analyticsEvent.updateMany({ where: { userId: id }, data: { userId: null } }),
    ]);
    await logAudit(null, "Deleted member", "Account deleted", "Member requested deletion; identifiers scrubbed.");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Feedback channel - works signed in or out. */
router.post("/feedback", optionalAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = feedbackSchema.parse(req.body);
    await prisma.feedback.create({
      data: {
        userId: req.user?.id ?? null,
        message: body.message,
        email: body.email || req.user?.email || null,
      },
    });
    if (req.user) {
      await logAudit(req.user.id, req.user.name, "Feedback sent", "Member left feedback.");
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Admin: list members. */
router.get("/", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, name: true, role: true, emailVerified: true, showOnWall: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

/** Admin: change a role. */
router.patch("/:id/role", requireAuth, requireRole("ADMIN"), async (req: AuthedRequest, res, next) => {
  try {
    const body = roleSchema.parse(req.body);
    if (req.params.id === req.user!.id) throw new HttpError(400, "You cannot change your own role.");
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: body.role } });
    await logAudit(req.user!.id, req.user!.name, "Role changed", `${user.email} is now ${body.role}.`);
    res.json({ user: { id: user.id, role: user.role } });
  } catch (err) {
    next(err);
  }
});

/** Admin: feedback inbox. */
router.get("/feedback/inbox", requireAuth, requireRole("MODERATOR", "ADMIN"), async (_req, res, next) => {
  try {
    const feedback = await prisma.feedback.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ feedback });
  } catch (err) {
    next(err);
  }
});

export default router;
