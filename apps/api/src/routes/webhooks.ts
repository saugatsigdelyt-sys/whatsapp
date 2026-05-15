import { Router } from "express";
import prisma from "../lib/prisma";
import { decrypt } from "../lib/encryption";
import { registerWebhook } from "../lib/meta";
import { requireAuth, requireBusiness } from "../middleware/auth";

export const webhooksRouter = Router();
webhooksRouter.use(requireAuth);
webhooksRouter.use(requireBusiness);

// GET /api/webhooks — get webhook subscription status
webhooksRouter.get("/", async (req, res, next) => {
  try {
    const sub = await prisma.webhookSubscription.findUnique({
      where: { businessId: req.user!.businessId },
    });
    return res.json({ success: true, data: sub });
  } catch (err) {
    next(err);
  }
});

// POST /api/webhooks/register — register webhook with Meta
webhooksRouter.post("/register", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;

    const cred = await prisma.waCredential.findFirst({ where: { businessId } });
    if (!cred) {
      return res.status(400).json({ success: false, error: "Import credentials first" });
    }

    const appSecret = decrypt(cred.appSecretEnc);
    const accessToken = decrypt(cred.accessTokenEnc);
    const callbackUrl = process.env.WEBHOOK_CALLBACK_URL ?? `${process.env.WEBHOOK_BASE_URL}/webhook`;
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN!;

    const result = await registerWebhook({
      appId: cred.appId,
      appSecret,
      wabaId: cred.wabaId,
      accessToken,
      callbackUrl,
      verifyToken,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    // Update credential and create subscription record
    await prisma.waCredential.update({
      where: { id: cred.id },
      data: { webhookRegistered: true },
    });

    const sub = await prisma.webhookSubscription.upsert({
      where: { businessId },
      update: {
        accountAlerts: true,
        accountReviewUpdate: true,
        accountUpdate: true,
        businessCapacityUpdate: true,
        messageTemplateQualityUpdate: true,
        messageTemplateStatusUpdate: true,
        messages: true,
        phoneNumberNameUpdate: true,
        phoneNumberQualityUpdate: true,
        security: true,
        templateCategoryUpdate: true,
      },
      create: {
        businessId,
        accountAlerts: true,
        accountReviewUpdate: true,
        accountUpdate: true,
        businessCapacityUpdate: true,
        messageTemplateQualityUpdate: true,
        messageTemplateStatusUpdate: true,
        messages: true,
        phoneNumberNameUpdate: true,
        phoneNumberQualityUpdate: true,
        security: true,
        templateCategoryUpdate: true,
      },
    });

    return res.json({
      success: true,
      message: "Webhook registered with Meta. All 11 fields subscribed.",
      data: sub,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/webhooks/events — recent account events
webhooksRouter.get("/events", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 30;

    const [events, total] = await Promise.all([
      prisma.accountEvent.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.accountEvent.count({ where: { businessId } }),
    ]);

    return res.json({
      success: true,
      data: events,
      total,
      page,
      hasMore: page * pageSize < total,
    });
  } catch (err) {
    next(err);
  }
});
