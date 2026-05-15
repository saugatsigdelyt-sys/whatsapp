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

    const member = await prisma.businessMember.findFirst({
      where: { businessId, userId: req.user!.userId },
    });
    let accessibleCredIds: string[] = [];
    if (member?.role === "OWNER" || member?.role === "ADMIN") {
      const creds = await prisma.waCredential.findMany({ where: { businessId }, select: { id: true } });
      accessibleCredIds = creds.map((c) => c.id);
    } else if (member) {
      const access = await prisma.waAccountAccess.findMany({
        where: { businessMemberId: member.id },
        select: { waCredentialId: true },
      });
      accessibleCredIds = access.map((a) => a.waCredentialId);
    }

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
