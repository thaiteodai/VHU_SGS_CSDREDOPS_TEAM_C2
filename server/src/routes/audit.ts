import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { prisma } from "../db.js";

const router = Router();

/** The public transparency log: every meaningful action, newest first. */
router.get("/", requireAuth, async (_req, res, next) => {
  try {
    const events = await prisma.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
    });
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

/** Moderator view: what is being roasted the most. */
router.get("/stats", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const [targets, roasts, members, overdue] = await Promise.all([
      prisma.target.count(),
      prisma.roast.count({ where: { hiddenAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.target.count({ where: { status: "OPEN", dueAt: { lt: new Date() } } }),
    ]);
    res.json({ stats: { targets, roasts, members, overdue } });
  } catch (err) {
    next(err);
  }
});

export default router;
