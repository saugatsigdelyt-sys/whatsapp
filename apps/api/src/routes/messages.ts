import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { decrypt } from "../lib/encryption";
import { sendTextMessage } from "../lib/meta";
import { requireAuth, requireBusiness } from "../middleware/auth";

export const messagesRouter = Router();
messagesRouter.use(requireAuth);
messagesRouter.use(requireBusiness);

// GET /api/messages — paginated message inbox
messagesRouter.get("/", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const direction = req.query.direction as string | undefined;
    const search = req.query.search as string | undefined;

    const where = {
      businessId,
      ...(direction ? { direction: direction as "INBOUND" | "OUTBOUND" } : {}),
      ...(search
        ? {
            OR: [
              { fromPhone: { contains: search } },
              { toPhone: { contains: search } },
              { textBody: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          waMessageId: true,
          direction: true,
          status: true,
          fromPhone: true,
          toPhone: true,
          type: true,
          textBody: true,
          mediaCaption: true,
          mediaUrl: true,
          timestamp: true,
          createdAt: true,
        },
      }),
      prisma.message.count({ where }),
    ]);

    return res.json({
      success: true,
      data: messages,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/:id — single message with full payload
messagesRouter.get("/:id", async (req, res, next) => {
  try {
    const message = await prisma.message.findFirst({
      where: { id: req.params.id, businessId: req.user!.businessId },
    });
    if (!message) return res.status(404).json({ success: false, error: "Message not found" });
    return res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/send — send a text message
const sendSchema = z.object({
  to: z.string().min(5),
  text: z.string().min(1).max(4096),
});

messagesRouter.post("/send", async (req, res, next) => {
  try {
    const body = sendSchema.parse(req.body);
    const businessId = req.user!.businessId!;

    const cred = await prisma.waCredential.findFirst({ where: { businessId } });
    if (!cred) {
      return res.status(400).json({ success: false, error: "No WA credentials configured" });
    }

    const accessToken = decrypt(cred.accessTokenEnc);
    const result = await sendTextMessage({
      phoneNumberId: cred.phoneNumberId,
      accessToken,
      to: body.to,
      text: body.text,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    // Save outbound message to DB
    await prisma.message.create({
      data: {
        businessId,
        waMessageId: result.messageId ?? `local-${Date.now()}`,
        direction: "OUTBOUND",
        status: "SENT",
        fromPhone: cred.phoneNumberId,
        toPhone: body.to,
        type: "TEXT",
        textBody: body.text,
        timestamp: new Date(),
      },
    });

    return res.json({ success: true, data: { messageId: result.messageId } });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/stats — message counts
messagesRouter.get("/summary/stats", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const [total, inbound, outbound, today] = await Promise.all([
      prisma.message.count({ where: { businessId } }),
      prisma.message.count({ where: { businessId, direction: "INBOUND" } }),
      prisma.message.count({ where: { businessId, direction: "OUTBOUND" } }),
      prisma.message.count({
        where: {
          businessId,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);
    return res.json({ success: true, data: { total, inbound, outbound, today } });
  } catch (err) {
    next(err);
  }
});
