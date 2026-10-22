import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getCuratedPack, getTemplatePool, fetchMemeImage, renderUrl } from "../services/meme.service.js";

const router = Router();

/** Template pool for the client. */
router.get("/templates", requireAuth, async (_req, res, next) => {
  try {
    const pool = await getTemplatePool();
    res.json({ templates: pool.slice(0, 120), curated: getCuratedPack() });
  } catch (err) {
    next(err);
  }
});

/**
 * Server-side meme rendering + caching. The browser never calls a third party
 * directly, and repeat views are served from disk instantly.
 */
router.get("/render", requireAuth, async (req, res, next) => {
  try {
    const templateId = String(req.query.template ?? "");
    const top = String(req.query.top ?? "").slice(0, 90);
    const bottom = String(req.query.bottom ?? "").slice(0, 90);
    if (!templateId) return res.status(400).json({ error: "template is required" });

    const image = await fetchMemeImage(templateId, top, bottom);
    if (!image) {
      // Graceful fallback so the UI never shows a broken image.
      return res.status(404).json({
        error: "Meme rendering is unavailable right now.",
        fallback: { top, bottom },
      });
    }
    res.setHeader("Content-Type", image.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.send(image.buffer);
  } catch (err) {
    next(err);
  }
});

router.get("/url", requireAuth, async (req, res, next) => {
  try {
    const templateId = String(req.query.template ?? "");
    const top = String(req.query.top ?? "");
    const bottom = String(req.query.bottom ?? "");
    if (!templateId) return res.status(400).json({ error: "template is required" });
    res.json({ url: renderUrl(templateId, top, bottom) });
  } catch (err) {
    next(err);
  }
});

export default router;
