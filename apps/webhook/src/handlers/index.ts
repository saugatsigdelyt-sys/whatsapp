import { prisma } from "@whatsapp-saas/database";
import type {
  WhatsAppWebhookPayload,
  WhatsAppChange,
  WebhookField,
} from "@whatsapp-saas/types";
import { handleMessages } from "./messages";
import { handleAccountEvent } from "./account-events";

export interface WebhookJobData {
  wabaId: string;       // WhatsApp Business Account ID
  businessId: string;   // Our internal business ID
  field: WebhookField;
  value: unknown;
  receivedAt: string;
}

/**
 * Resolves a WABA ID to our internal businessId.
 * This mapping comes from the wa_credentials table.
 */
export async function resolveBusinessId(wabaId: string): Promise<string | null> {
  const cred = await prisma.waCredential.findFirst({
    where: { wabaId },
    select: { businessId: true },
  });
  return cred?.businessId ?? null;
}

/**
 * Called by the BullMQ worker for each queued job.
 */
export async function processWebhookJob(data: WebhookJobData): Promise<void> {
  const { field, value, businessId } = data;

  if (field === "messages") {
    await handleMessages(businessId, value);
  } else {
    await handleAccountEvent(businessId, field, value);
  }
}

/**
 * Parses the raw webhook payload and dispatches jobs.
 */
export async function dispatchWebhookPayload(
  payload: WhatsAppWebhookPayload,
  enqueue: (data: WebhookJobData) => Promise<void>
): Promise<void> {
  if (payload.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry) {
    const wabaId = entry.id;
    const businessId = await resolveBusinessId(wabaId);

    if (!businessId) {
      console.warn(`[webhook] Unknown WABA ID: ${wabaId} — skipping`);
      continue;
    }

    for (const change of entry.changes) {
      await enqueue({
        wabaId,
        businessId,
        field: change.field as WebhookField,
        value: change.value,
        receivedAt: new Date().toISOString(),
      });
    }
  }
}
