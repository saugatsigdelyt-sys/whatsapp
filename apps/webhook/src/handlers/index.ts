import { prisma } from "@whatsapp-saas/database";
import type {
  WhatsAppWebhookPayload,
  WebhookField,
} from "@whatsapp-saas/types";
import { handleMessages } from "./messages";
import { handleAccountEvent } from "./account-events";

async function resolveBusinessId(wabaId: string): Promise<string | null> {
  const cred = await prisma.waCredential.findFirst({
    where: { wabaId },
    select: { businessId: true },
  });
  return cred?.businessId ?? null;
}

async function processChange(businessId: string, field: string, value: unknown): Promise<void> {
  if (field === "messages") {
    await handleMessages(businessId, value);
  } else {
    await handleAccountEvent(businessId, field as WebhookField, value);
  }
}

export async function dispatchWebhookPayload(payload: WhatsAppWebhookPayload): Promise<void> {
  if (payload.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry) {
    const wabaId = entry.id;
    const businessId = await resolveBusinessId(wabaId);

    if (!businessId) {
      console.warn(`[webhook] Unknown WABA ID: ${wabaId} — skipping`);
      continue;
    }

    for (const change of entry.changes) {
      try {
        await processChange(businessId, change.field, change.value);
        console.log(`[webhook] Processed field=${change.field} for WABA=${wabaId}`);
      } catch (err) {
        console.error(`[webhook] Error processing field=${change.field}:`, err);
      }
    }
  }
}
