import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { authRouter } from "./routes/auth";
import { accountsRouter } from "./routes/accounts";
import { messagesRouter } from "./routes/messages";
import { webhooksRouter } from "./routes/webhooks";
import { errorHandler } from "./middleware/error";

const app = express();
const PORT = process.env.API_PORT ?? 4000;

// ── Security middleware ────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
  credentials: true,
}));

// ── Rate limiting ──────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// ── Body parsing ───────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Logging ────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Health check ───────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ─────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/webhooks", webhooksRouter);

// ── 404 fallback ───────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ── Error handler ──────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📋 Health: http://localhost:${PORT}/health`);
});

export default app;
