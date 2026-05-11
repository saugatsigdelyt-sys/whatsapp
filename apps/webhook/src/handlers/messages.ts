import { prisma } from "@whatsapp-saas/database";
import type { WhatsAppChangeValue, WhatsAppMessage } from "@whatsapp-saas/types";

/**
 * Processes the "messages" webhook field.
 * Handles both inbound messages and outbound status updates.
 */
export async function handleMessages(
  businessId: string,
  value: unknown
): Promise<void> {
  const data = value as WhatsAppChangeValue;

  // ── Inbound messages ───────────────────────────
  if (data.messages?.length) {
    for (const msg of data.messages) {
      await upsertInboundMessage(businessId, msg, data.metadata.phone_number_id);
    }
  }

  // ── Status updates (sent/delivered/read/failed) ─
  if (data.statuses?.length) {
    for (const status of data.statuses) {
      await prisma.message.updateMany({
        where: { waMessageId: status.id, businessId },
        data: {
          status: mapStatus(status.status),
        },
      });
    }
  }
}

async function upsertInboundMessage(
  businessId: string,
  msg: WhatsAppMessage,
  phoneNumberId: string
): Promise<void> {
  // Find our PhoneNumber record
  const phoneRecord = await prisma.phoneNumber.findFirst({
    where: { phoneNumberId, businessId },
  });

  try {
    await prisma.message.upsert({
      where: { waMessageId: msg.id },
      update: {}, // Don't overwrite existing inbound messages
      create: {
        businessId,
        waMessageId: msg.id,
        direction: "INBOUND",
        status: "RECEIVED",
        fromPhone: msg.from,
        toPhone: phoneRecord?.displayPhone ?? phoneNumberId,
        type: mapMessageType(msg.type),
        textBody: msg.text?.body ?? null,
        mediaId: msg.image?.id ?? msg.video?.id ?? msg.audio?.id ?? msg.document?.id ?? null,
        mediaMimeType:
          msg.image?.mime_type ??
          msg.video?.mime_type ??
          msg.audio?.mime_type ??
          msg.document?.mime_type ??
          null,
        mediaCaption:
          msg.image?.caption ?? msg.video?.caption ?? msg.document?.caption ?? null,
        interactiveType: msg.interactive?.type ?? null,
        interactivePayload: msg.interactive ? (msg.interactive as object) : undefined,
        rawPayload: msg as object,
        phoneNumberId: phoneRecord?.id ?? null,
        timestamp: new Date(parseInt(msg.timestamp) * 1000),
      },
    });

    console.log(`📨 Saved inbound message ${msg.id} from ${msg.from}`);
  } catch (err) {
    console.error(`[messages] Failed to save message ${msg.id}:`, err);
    throw err;
  }
}

function mapMessageType(type: string) {
  const map: Record<string, string> = {
    text: "TEXT",
    image: "IMAGE",
    video: "VIDEO",
    audio: "AUDIO",
    document: "DOCUMENT",
    sticker: "STICKER",
    location: "LOCATION",
    contacts: "CONTACTS",
    interactive: "INTERACTIVE",
    button: "BUTTON",
  };
  return (map[type] ?? "UNKNOWN") as
    | "TEXT"
    | "IMAGE"
    | "VIDEO"
    | "AUDIO"
    | "DOCUMENT"
    | "STICKER"
    | "LOCATION"
    | "CONTACTS"
    | "INTERACTIVE"
    | "BUTTON"
    | "UNKNOWN";
}

function mapStatus(status: string) {
  const map: Record<string, string> = {
    sent: "SENT",
    delivered: "DELIVERED",
    read: "READ",
    failed: "FAILED",
  };
  return (map[status] ?? "SENT") as "SENT" | "DELIVERED" | "READ" | "FAILED";
}
