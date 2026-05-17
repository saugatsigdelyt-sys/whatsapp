import "dotenv/config";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import type { WhatsAppWebhookPayload } from "@whatsapp-saas/types";
import { dispatchWebhookPayload } from "./handlers";

const app = express();
const PORT = process.env.WEBHOOK_PORT ?? 4001;
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

if (!VERIFY_TOKEN) {
  console.error("❌ WEBHOOK_VERIFY_TOKEN is not set. Exiting.");
  process.exit(1);
}

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// ── Health check ───────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "webhook-receiver", timestamp: new Date().toISOString() });
});

// ── GET /webhook — Meta verification challenge ─
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log(`[webhook] Verification attempt — mode: ${mode}, token matches: ${token === VERIFY_TOKEN}`);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified by Meta");
    return res.status(200).send(challenge);
  }

  console.warn("⚠️  Webhook verification failed — token mismatch");
  return res.status(403).json({ error: "Verification failed" });
});

// ── POST /webhook — receive events from Meta ───
app.post("/webhook", (req, res) => {
  // Always respond 200 immediately — Meta will retry if it doesn't get a fast response
  res.status(200).send("EVENT_RECEIVED");

  const payload = req.body as WhatsAppWebhookPayload;

  if (!payload?.object) {
    console.warn("[webhook] Received empty or malformed payload");
    return;
  }

  console.log(`[webhook] Received payload: object=${payload.object}, entries=${payload.entry?.length ?? 0}`);

  // Process directly — no queue needed
  dispatchWebhookPayload(payload).catch((err) => {
    console.error("[webhook] Failed to process payload:", err);
  });
});

// ── Start server ───────────────────────────────
app.listen(PORT, () => {
  console.log(`🪝  Webhook receiver running on http://localhost:${PORT}`);
  console.log(`📋 Verify URL: http://localhost:${PORT}/webhook`);
  console.log(`🔑 Verify token: ${VERIFY_TOKEN}`);
  console.log(`✅ Direct processing mode (no Redis queue)`);
});

export default app;
