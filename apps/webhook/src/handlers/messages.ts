import { prisma } from "@whatsapp-saas/database";
import type { WhatsAppChangeValue, WhatsAppMessage } from "@whatsapp-saas/types";

export async function handleMessages(businessId: string, value: unknown): Promise<void> {
  const data = value as WhatsAppChangeValue;

  if (data.messages?.length) {
    for (const msg of data.messages) {
      await upsertInboundMessage(businessId, msg, data.metadata.phone_number_id);
    }
  }

  if (data.statuses?.length) {
    for (const status of data.statuses) {
      await prisma.message.updateMany({
        where: { waMessageId: status.id, businessId },
        data: { status: mapStatus(status.status) },
      });
    }
  }
}

async function upsertInboundMessage(businessId: string, msg: WhatsAppMessage, phoneNumberId: string): Promise<void> {
  const [phoneRecord, cred] = await Promise.all([
    prisma.phoneNumber.findFirst({ where: { phoneNumberId, businessId } }),
    prisma.waCredential.findFirst({ where: { phoneNumberId, businessId } }),
  ]);

  // Create or update conversation for this contact
  let conversationId: string | null = null;
  if (cred) {
    try {
      const conversation = await prisma.conversation.upsert({
        where: { waCredentialId_contactPhone: { waCredentialId: cred.id, contactPhone: msg.from } },
        update: {
          lastMessageAt: new Date(parseInt(msg.timestamp) * 1000),
          unreadCount: { increment: 1 },
        },
        create: {
          businessId,
          waCredentialId: cred.id,
          contactPhone: msg.from,
          lastMessageAt: new Date(parseInt(msg.timestamp) * 1000),
          unreadCount: 1,
        },
      });
      conversationId = conversation.id;
    } catch (convErr) {
      console.error(`[messages] Failed to upsert conversation for ${msg.from}:`, convErr);
    }
  }

  try {
    await prisma.message.upsert({
      where: { waMessageId: msg.id },
      update: {},
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
        mediaMimeType: msg.image?.mime_type ?? msg.video?.mime_type ?? msg.audio?.mime_type ?? msg.document?.mime_type ?? null,
        mediaCaption: msg.image?.caption ?? msg.video?.caption ?? msg.document?.caption ?? null,
        interactiveType: msg.interactive?.type ?? null,
        interactivePayload: msg.interactive ? (msg.interactive as object) : undefined,
        rawPayload: msg as object,
        phoneNumberId: phoneRecord?.id ?? null,
        conversationId,
        timestamp: new Date(parseInt(msg.timestamp) * 1000),
      },
    });
    console.log(`📨 Saved inbound message ${msg.id} from ${msg.from} → conv:${conversationId}`);
  } catch (err) {
    console.error(`[messages] Failed to save message ${msg.id}:`, err);
    throw err;
  }
}

function mapMessageType(type: string): any {
  const map: Record<string, string> = {
    text: "TEXT", image: "IMAGE", video: "VIDEO", audio: "AUDIO",
    document: "DOCUMENT", sticker: "STICKER", location: "LOCATION",
    contacts: "CONTACTS", interactive: "INTERACTIVE", button: "BUTTON",
  };
  return map[type] ?? "UNKNOWN";
}

function mapStatus(status: string): any {
  const map: Record<string, string> = { sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" };
  return map[status] ?? "SENT";
}
