import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { personalityMeta } from "../services/roast.service.js";

const router = Router();

/**
 * The Wall of Shame. Opt-in: a member only appears here if they ticked
 * showOnWall. Members can leave the wall at any time from Settings.
 */
router.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const targets = await prisma.target.findMany({
      where: {
        owner: { showOnWall: true, deletedAt: null },
        OR: [{ status: "ABANDONED" }, { status: "OPEN", dueAt: { lt: new Date() } }],
      },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { dueAt: "asc" },
      take: 50,
    });

    const entries = await Promise.all(
      targets.map(async (t) => {
        const daysLate = Math.floor((Date.now() - new Date(t.dueAt).getTime()) / 86400000);
        return {
          id: t.id,
          title: t.title,
          owner: t.owner.name,
          personality: t.personality,
          personalityLabel: personalityMeta(t.personality).label,
          dueAt: t.dueAt,
          status: t.status,
          daysLate,
          shame: daysLate >= 30 ? "LEGENDARY" : daysLate >= 14 ? "NOTORIOUS" : daysLate >= 7 ? "BAKING" : daysLate >= 1 ? "FRESH" : "JUST NOW",
        };
      }),
    );

    res.json({
      entries,
      optedIn: entries.some((e) => e.owner === req.user!.name),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
