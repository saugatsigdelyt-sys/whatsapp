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
import { teamRouter } from "./routes/team";
import { subscriptionsRouter } from "./routes/subscriptions";
import { conversationsRouter } from "./routes/conversations";
import { templatesRouter } from "./routes/templates";
import { bulkSendRouter } from "./routes/bulk-send";
import { paymentsRouter } from "./routes/payments";
import { adminRouter, publicAnnouncementRouter } from "./routes/admin";
import { errorHandler } from "./middleware/error";

const app = express();
const PORT = process.env.API_PORT ?? 4000;

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use("/api/", limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use("/api/auth", authRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/team", teamRouter);
app.use("/api/subscription", subscriptionsRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/bulk-send", bulkSendRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/announcements", publicAnnouncementRouter);

app.use((_req, res) => res.status(404).json({ success: false, error: "Route not found" }));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📋 Health: http://localhost:${PORT}/health`);
});

export default app;
