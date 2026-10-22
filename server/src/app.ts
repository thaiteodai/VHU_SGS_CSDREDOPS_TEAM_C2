import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { errorHandler, notFound } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import targetRoutes from "./routes/targets.js";
import shameRoutes from "./routes/shame.js";
import memeRoutes from "./routes/memes.js";
import userRoutes from "./routes/users.js";
import analyticsRoutes from "./routes/analytics.js";
import auditRoutes from "./routes/audit.js";
import healthRoutes from "./routes/health.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(morgan("combined"));

  // Generous for normal browsing, tight on the credential endpoints.
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many attempts. Take a short breather." },
    }),
  );

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/targets", targetRoutes);
  app.use("/api/shame", shameRoutes);
  app.use("/api/memes", memeRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/audit", auditRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
