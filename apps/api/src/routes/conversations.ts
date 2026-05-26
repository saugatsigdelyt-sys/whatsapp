import { Router } from "express";
import prisma from "../lib/prisma";
import { decrypt } from "../lib/encryption";
import { sendTextMessage } from "../lib/meta";
import { requireAuth, requireBusiness } from "../middleware/auth";

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);
conversationsRouter.use(requireBusiness);

// GET /api/conversations — list conversations for accessible accounts
conversationsRouter.get("/", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const credentialId = req.query.credentialId as string | undefined;

    // All business members can access conversations — same policy as /api/messages
    const creds = await prisma.waCredential.findMany({ where: { businessId }, select: { id: true } });
    const accessibleCredIds = creds.map((c) => c.id);

    if (credentialId && !accessibleCredIds.includes(credentialId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        businessId,
        waCredentialId: credentialId ? credentialId : { in: accessibleCredIds },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 200,
      include: {
        waCredential: { select: { id: true, name: true, displayPhone: true, phoneNumberId: true } },
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
          select: { textBody: true, direction: true, timestamp: true, type: true },
        },
      },
    });

    return res.json({ success: true, data: conversations, accessibleCredIds });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversations/:id/messages
conversationsRouter.get("/:id/messages", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 50;

    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, businessId },
      include: { waCredential: { select: { id: true, name: true, displayPhone: true } } },
    });
    if (!conversation) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: req.params.id },
        orderBy: { timestamp: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.message.count({ where: { conversationId: req.params.id } }),
    ]);

    // Mark as read
    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { unreadCount: 0 },
    });

    return res.json({ success: true, data: messages, total, page, hasMore: page * pageSize < total, conversation });
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations/backfill — create conversations from existing messages
conversationsRouter.post("/backfill", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;

    // Get all credentials for this business
    const creds = await prisma.waCredential.findMany({ where: { businessId } });
    const credsByPhoneNumberId = Object.fromEntries(creds.map((c) => [c.phoneNumberId, c]));

    // Find all inbound messages that have no conversationId
    const orphanMessages = await prisma.message.findMany({
      where: { businessId, conversationId: null, direction: "INBOUND" },
      orderBy: { timestamp: "asc" },
    });

    let created = 0;
    let linked = 0;

    // Build a display-phone → credential map for fallback lookups
    const credsByDisplayPhone = Object.fromEntries(
      creds.filter(c => c.displayPhone).map(c => [c.displayPhone!, c])
    );

    for (const msg of orphanMessages) {
      // Find the credential this message belongs to.
      // toPhone may be stored as a Meta phoneNumberId OR a human-readable displayPhone.
      // Fallback: follow Message.phoneNumberId → PhoneNumber.phoneNumberId → WaCredential.
      let cred = credsByPhoneNumberId[msg.toPhone]
        ?? credsByDisplayPhone[msg.toPhone];

      if (!cred && msg.phoneNumberId) {
        const phoneRecord = await prisma.phoneNumber.findUnique({
          where: { id: msg.phoneNumberId },
          select: { phoneNumberId: true },
        });
        if (phoneRecord) {
          cred = credsByPhoneNumberId[phoneRecord.phoneNumberId];
        }
      }

      // Last resort: only one credential for this business — use it
      if (!cred && creds.length === 1) {
        cred = creds[0];
      }

      if (!cred) continue;

      // Upsert conversation
      const conv = await prisma.conversation.upsert({
        where: { waCredentialId_contactPhone: { waCredentialId: cred.id, contactPhone: msg.fromPhone } },
        update: { lastMessageAt: msg.timestamp, unreadCount: { increment: 1 } },
        create: {
          businessId, waCredentialId: cred.id,
          contactPhone: msg.fromPhone,
          lastMessageAt: msg.timestamp,
          unreadCount: 1,
        },
      });

      if (!conv.id) continue;

      // Link message to conversation
      await prisma.message.update({
        where: { id: msg.id },
        data: { conversationId: conv.id },
      });

      linked++;
      if (conv.unreadCount === 1) created++;
    }

    return res.json({ success: true, message: `Backfill complete: ${created} conversations created, ${linked} messages linked` });
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations/:id/reply
conversationsRouter.post("/:id/reply", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const { text } = req.body as { text: string };
    if (!text?.trim()) return res.status(400).json({ success: false, error: "text is required" });

    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, businessId },
      include: { waCredential: true },
    });
    if (!conversation) return res.status(404).json({ success: false, error: "Conversation not found" });

    const accessToken = decrypt(conversation.waCredential.accessTokenEnc);
    const result = await sendTextMessage({
      phoneNumberId: conversation.waCredential.phoneNumberId,
      accessToken,
      to: conversation.contactPhone,
      text: text.trim(),
    });

    if (!result.success) return res.status(400).json({ success: false, error: result.error });

    const message = await prisma.message.create({
      data: {
        businessId,
        waMessageId: result.messageId ?? `local-${Date.now()}`,
        direction: "OUTBOUND",
        status: "SENT",
        fromPhone: conversation.waCredential.phoneNumberId,
        toPhone: conversation.contactPhone,
        type: "TEXT",
        textBody: text.trim(),
        conversationId: conversation.id,
        timestamp: new Date(),
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});
