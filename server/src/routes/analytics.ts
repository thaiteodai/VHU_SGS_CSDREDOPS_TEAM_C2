import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { trackEvent } from "../services/audit.service.js";
import { analyticsSchema } from "../validators/index.js";

const router = Router();

/**
 * First-party analytics. No third-party tracker: events land in our own
 * database so we can read them without shipping member data anywhere.
 */
router.post("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = analyticsSchema.parse(req.body);
    await trackEvent(body.name, {
      userId: req.user!.id,
      path: body.path ?? null,
      meta: body.meta,
    });
    res.status(202).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
