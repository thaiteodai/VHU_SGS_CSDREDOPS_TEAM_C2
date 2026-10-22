import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

/** Liveness: is the process up. */
router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "panicplan-server",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/** Readiness: can we actually serve traffic (database reachable). */
router.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", database: "up", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "not ready", database: "down" });
  }
});

export default router;
