import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, AuthedRequest, requireRole, requireTargetAccess } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { logAudit, trackEvent } from "../services/audit.service.js";
import { buildRoast, PERSONALITIES, personalityMeta, tierFor, tierMeta } from "../services/roast.service.js";
import { chooseTemplate, getTemplatePool } from "../services/meme.service.js";
import { targetSchema, targetUpdateSchema, stepSchema, buddyInviteSchema } from "../validators/index.js";

const router = Router();

/**
 * Serialises a target for the client, including the derived panic state.
 */
async function serialise(target: any, viewerId: string) {
  const now = new Date();
  const tier = tierFor(target.dueAt, target.chaosLevel, now);
  const total = new Date(target.dueAt).getTime() - new Date(target.createdAt).getTime();
  const elapsed = now.getTime() - new Date(target.createdAt).getTime();
  const progress = total <= 0 ? 1 : Math.min(1, Math.max(0, elapsed / total));
  const overdue = new Date(target.dueAt) < now && target.status === "OPEN";

  const [enrolled, waiting, roasts] = await Promise.all([
    prisma.step.count({ where: { targetId: target.id, done: true } }),
    prisma.step.count({ where: { targetId: target.id } }),
    prisma.roast.count({ where: { targetId: target.id, hiddenAt: null } }),
  ]);

  return {
    id: target.id,
    title: target.title,
    description: target.description,
    dueAt: target.dueAt,
    chaosLevel: target.chaosLevel,
    personality: target.personality,
    personalityLabel: personalityMeta(target.personality).label,
    personalityBlurb: personalityMeta(target.personality).blurb,
    status: target.status,
    completedAt: target.completedAt,
    createdAt: target.createdAt,
    owner: { id: target.owner.id, name: target.owner.name },
    isOwner: target.ownerId === viewerId,
    stepsDone: enrolled,
    stepsTotal: waiting,
    roastCount: roasts,
    tier,
    tierKey: tierMeta(tier).key,
    tierLabel: tierMeta(tier).label,
    tierColour: tierMeta(tier).colour,
    panic: Math.round(progress * 100),
    overdue,
  };
}

const includeTarget = {
  owner: { select: { id: true, name: true } },
} as const;

router.get("/personalities", (_req, res) => {
  res.json({ personalities: PERSONALITIES.map((p) => ({ key: p.key, label: p.label, blurb: p.blurb })) });
});

/** Targets the signed-in user owns or is an accepted buddy of. */
router.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const targets = await prisma.target.findMany({
      where: {
        status: "OPEN",
        OR: [{ ownerId: userId }, { buddies: { some: { buddyId: userId, status: "ACCEPTED" } } }],
      },
      include: includeTarget,
      orderBy: { dueAt: "asc" },
    });
    res.json({ targets: await Promise.all(targets.map((t) => serialise(t, userId))) });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const target = await prisma.target.findUnique({
      where: { id: req.params.id },
      include: {
        ...includeTarget,
        steps: { orderBy: { sortOrder: "asc" } },
        buddies: {
          include: { buddy: { select: { id: true, name: true, email: true } }, inviter: { select: { id: true, name: true } } },
        },
        roasts: {
          where: { hiddenAt: null },
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!target) throw new HttpError(404, "That target does not exist.");
    if (!(await requireTargetAccess(target.id, req.user!.id, "read"))) {
      throw new HttpError(403, "This target is not shared with you.");
    }
    const serialised = await serialise(target, req.user!.id);
    res.json({
      target: {
        ...serialised,
        steps: target.steps,
        buddies: target.buddies,
        roasts: target.roasts,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = targetSchema.parse(req.body);
    const target = await prisma.target.create({
      data: {
        ownerId: req.user!.id,
        title: body.title,
        description: body.description ?? null,
        dueAt: body.dueAt,
        chaosLevel: body.chaosLevel,
        personality: body.personality,
      },
      include: includeTarget,
    });
    await logAudit(req.user!.id, req.user!.name, "Target created", `${target.title} due ${target.dueAt.toISOString()}.`);
    await trackEvent("target_created", { userId: req.user!.id, meta: { chaosLevel: body.chaosLevel } });
    res.status(201).json({ target: await serialise(target, req.user!.id) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!(await requireTargetAccess(req.params.id, req.user!.id, "owner"))) {
      throw new HttpError(403, "Only the owner can edit this target.");
    }
    const body = targetUpdateSchema.parse(req.body);
    const target = await prisma.target.update({
      where: { id: req.params.id },
      data: body,
      include: includeTarget,
    });
    await logAudit(req.user!.id, req.user!.name, "Target updated", `${target.title} updated.`);
    res.json({ target: await serialise(target, req.user!.id) });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const target = await prisma.target.findUnique({ where: { id: req.params.id } });
    if (!target) throw new HttpError(404, "That target does not exist.");
    if (target.ownerId !== req.user!.id) {
      throw new HttpError(403, "Only the owner can delete this target.");
    }
    await prisma.target.delete({ where: { id: target.id } });
    await logAudit(req.user!.id, req.user!.name, "Target deleted", `${target.title} deleted.`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/status", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ status: z.enum(["OPEN", "COMPLETED", "ABANDONED"]) }).parse(req.body);
    const target = await prisma.target.findUnique({ where: { id: req.params.id } });
    if (!target) throw new HttpError(404, "That target does not exist.");
    if (target.ownerId !== req.user!.id) {
      throw new HttpError(403, "Only the owner can change this target's status.");
    }
    const updated = await prisma.target.update({
      where: { id: target.id },
      data: {
        status: body.status,
        completedAt: body.status === "COMPLETED" ? new Date() : null,
      },
      include: includeTarget,
    });
    await logAudit(req.user!.id, req.user!.name, `Target ${body.status.toLowerCase()}`, `${target.title}.`);
    await trackEvent(`target_${body.status.toLowerCase()}`, { userId: req.user!.id });
    res.json({ target: await serialise(updated, req.user!.id) });
  } catch (err) {
    next(err);
  }
});

/** Steps - the checklist that makes a target actionable. */
router.post("/:id/steps", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!(await requireTargetAccess(req.params.id, req.user!.id, "owner-or-buddy"))) {
      throw new HttpError(403, "This target is not shared with you.");
    }
    const body = stepSchema.parse(req.body);
    const count = await prisma.step.count({ where: { targetId: req.params.id } });
    const step = await prisma.step.create({
      data: { targetId: req.params.id, userId: req.user!.id, label: body.label, sortOrder: count },
    });
    res.status(201).json({ step });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/steps/:stepId", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!(await requireTargetAccess(req.params.id, req.user!.id, "owner-or-buddy"))) {
      throw new HttpError(403, "This target is not shared with you.");
    }
    const body = z.object({ done: z.boolean() }).parse(req.body);
    const step = await prisma.step.update({
      where: { id: req.params.stepId },
      data: { done: body.done },
    });
    res.json({ step });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/steps/:stepId", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!(await requireTargetAccess(req.params.id, req.user!.id, "owner-or-buddy"))) {
      throw new HttpError(403, "This target is not shared with you.");
    }
    await prisma.step.delete({ where: { id: req.params.stepId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Buddies - invite, accept, revoke. */
router.post("/:id/buddies", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const target = await prisma.target.findUnique({ where: { id: req.params.id } });
    if (!target) throw new HttpError(404, "That target does not exist.");
    if (target.ownerId !== req.user!.id) {
      throw new HttpError(403, "Only the owner can invite buddies.");
    }
    const body = buddyInviteSchema.parse(req.body);

    const existing = await prisma.buddyLink.findFirst({
      where: { targetId: target.id, inviteEmail: body.email, status: { in: ["PENDING", "ACCEPTED"] } },
    });
    if (existing) throw new HttpError(409, "That person is already on this target.");

    const invitee = await prisma.user.findUnique({ where: { email: body.email } });
    const link = await prisma.buddyLink.create({
      data: {
        targetId: target.id,
        buddyId: invitee?.id ?? null,
        inviterId: req.user!.id,
        inviteEmail: body.email,
        status: "PENDING",
      },
    });
    await logAudit(req.user!.id, req.user!.name, "Buddy invited", `${body.email} invited to ${target.title}.`);
    res.status(201).json({ buddy: link });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/buddies/:buddyId/respond", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ status: z.enum(["ACCEPTED", "DECLINED"]) }).parse(req.body);
    const link = await prisma.buddyLink.findUnique({ where: { id: req.params.buddyId } });
    if (!link) throw new HttpError(404, "That invite does not exist.");
    if (link.inviteEmail !== req.user!.email) {
      throw new HttpError(403, "That invite was not sent to you.");
    }
    const updated = await prisma.buddyLink.update({
      where: { id: link.id },
      data: { status: body.status, buddyId: req.user!.id, respondedAt: new Date() },
    });
    await logAudit(req.user!.id, req.user!.name, `Buddy invite ${body.status.toLowerCase()}`, `Invite ${link.id}.`);
    res.json({ buddy: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/buddies/:buddyId", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const link = await prisma.buddyLink.findUnique({ where: { id: req.params.buddyId } });
    if (!link) throw new HttpError(404, "That invite does not exist.");
    const target = await prisma.target.findUnique({ where: { id: link.targetId } });
    if (target?.ownerId !== req.user!.id && link.buddyId !== req.user!.id) {
      throw new HttpError(403, "Only the owner or the invited person can remove this.");
    }
    await prisma.buddyLink.update({ where: { id: link.id }, data: { status: "REVOKED" } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Roasts - the accountability mechanic. */
router.post("/:id/roasts", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const target = await prisma.target.findUnique({ where: { id: req.params.id } });
    if (!target) throw new HttpError(404, "That target does not exist.");
    if (!(await requireTargetAccess(target.id, req.user!.id, "owner-or-buddy"))) {
      throw new HttpError(403, "Only the owner and buddies can roast this target.");
    }
    if (target.status !== "OPEN") throw new HttpError(400, "This target is closed. No more roasting.");

    const roast = buildRoast({
      title: target.title,
      dueAt: target.dueAt,
      chaosLevel: target.chaosLevel,
      personality: target.personality,
      seed: Date.now(),
    });

    const pool = await getTemplatePool();
    const template = chooseTemplate(Date.now(), pool);

    const saved = await prisma.roast.create({
      data: {
        targetId: target.id,
        authorId: req.user!.id,
        tier: roast.tier,
        body: roast.body,
        memeTemplateId: template?.id ?? null,
        memeTop: template ? roast.memeTop.slice(0, 90) : null,
        memeBottom: template ? roast.memeBottom.slice(0, 90) : null,
        memeAttribution: template?.attribution ?? null,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    await logAudit(req.user!.id, req.user!.name, "Roast deployed", `${roast.tierLabel} roast on ${target.title}.`);
    await trackEvent("roast_created", { userId: req.user!.id, meta: { tier: roast.tier } });

    res.status(201).json({ roast: saved, tier: roast.tier, tierLabel: roast.tierLabel });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/roasts/:roastId", requireAuth, requireRole("MODERATOR", "ADMIN"), async (req: AuthedRequest, res, next) => {
  try {
    await prisma.roast.update({ where: { id: req.params.roastId }, data: { hiddenAt: new Date() } });
    await logAudit(req.user!.id, req.user!.name, "Roast hidden", `Roast ${req.params.roastId} hidden by moderation.`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
