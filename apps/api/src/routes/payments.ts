import express, { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, requireBusiness } from "../middleware/auth";
import {
  createStaticAddress,
  createInvoice,
  verifyOxapayHmac,
  OxapayWebhookPayload,
} from "../lib/oxapay";

export const paymentsRouter = Router();

const CALLBACK_BASE = process.env.API_URL ?? "https://api.whatsapi.buzz";

// ── Plan pricing helpers ─────────────────────────────────────────────────
async function getPlanPrices() {
  let settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
  if (!settings) {
    settings = await prisma.platformSettings.create({
      data: { id: "singleton", updatedAt: new Date() },
    });
  }
  return settings;
}

const PLAN_TIERS: Record<string, string> = {
  STANDARD: "STANDARD",
  PREMIUM: "PREMIUM",
  PLATINUM: "PLATINUM",
};

// ── GET /api/payments/balance ────────────────────────────────────────────
paymentsRouter.get("/balance", requireAuth, requireBusiness, async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const [business, transactions] = await Promise.all([
      prisma.business.findUnique({ where: { id: businessId }, select: { balance: true, planExpiresAt: true } }),
      prisma.balanceTransaction.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    const sub = await prisma.subscription.findUnique({ where: { businessId }, select: { tier: true } });
    return res.json({
      success: true,
      data: {
        balance: business?.balance ?? 0,
        planExpiresAt: business?.planExpiresAt ?? null,
        tier: sub?.tier ?? "FREE",
        transactions,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/payments/prices ─────────────────────────────────────────────
paymentsRouter.get("/prices", async (_req, res, next) => {
  try {
    const s = await getPlanPrices();
    return res.json({
      success: true,
      data: {
        STANDARD: s.priceStandard,
        PREMIUM: s.pricePremium,
        PLATINUM: s.pricePlatinum,
        minDeposit: s.minDeposit,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payments/static-address ───────────────────────────────────
paymentsRouter.post("/static-address", requireAuth, requireBusiness, async (req, res, next) => {
  try {
    const { network } = z.object({ network: z.string().min(1) }).parse(req.body);
    const businessId = req.user!.businessId!;

    // Return existing if already created
    const existing = await prisma.oxapayAddress.findUnique({
      where: { businessId_network: { businessId, network } },
    });
    if (existing) {
      return res.json({ success: true, data: { address: existing.address, network: existing.network } });
    }

    // Create new static address
    const callbackUrl = `${CALLBACK_BASE}/api/payments/webhook`;
    let result;
    try {
      result = await createStaticAddress({
        network,
        orderId: `static_${businessId}_${network}`,
        callbackUrl,
        description: `WhatsAPI balance top-up — business ${businessId}`,
      });
    } catch (oxaErr: any) {
      console.error("[payments/static-address] OxaPay error:", oxaErr.message);
      return res.status(502).json({
        success: false,
        error: `Payment provider error: ${oxaErr.message}`,
      });
    }

    await prisma.oxapayAddress.create({
      data: {
        businessId,
        network: result.network,
        address: result.address,
        callbackUrl,
      },
    });

    return res.json({ success: true, data: { address: result.address, network: result.network } });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payments/invoice ───────────────────────────────────────────
paymentsRouter.post("/invoice", requireAuth, requireBusiness, async (req, res, next) => {
  try {
    const { amount } = z.object({ amount: z.number().min(5) }).parse(req.body);
    const businessId = req.user!.businessId!;
    const settings = await getPlanPrices();
    if (amount < settings.minDeposit) {
      return res.status(400).json({ success: false, error: `Minimum deposit is $${settings.minDeposit}` });
    }

    const callbackUrl = `${CALLBACK_BASE}/api/payments/webhook`;
    const orderId = `inv_${businessId}_${Date.now()}`;
    let result;
    try {
      result = await createInvoice({ amount, orderId, callbackUrl, description: "WhatsAPI balance top-up" });
    } catch (oxaErr: any) {
      console.error("[payments/invoice] OxaPay error:", oxaErr.message);
      return res.status(502).json({
        success: false,
        error: `Payment provider error: ${oxaErr.message}`,
      });
    }

    return res.json({ success: true, data: { trackId: result.trackId, payLink: result.payLink } });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payments/plan/purchase ────────────────────────────────────
paymentsRouter.post("/plan/purchase", requireAuth, requireBusiness, async (req, res, next) => {
  try {
    const { tier } = z.object({ tier: z.enum(["STANDARD", "PREMIUM", "PLATINUM"]) }).parse(req.body);
    const businessId = req.user!.businessId!;

    const [business, settings] = await Promise.all([
      prisma.business.findUnique({ where: { id: businessId }, select: { balance: true } }),
      getPlanPrices(),
    ]);

    const prices: Record<string, number> = {
      STANDARD: settings.priceStandard,
      PREMIUM: settings.pricePremium,
      PLATINUM: settings.pricePlatinum,
    };
    const price = prices[tier];
    if (!business || business.balance < price) {
      return res.status(402).json({
        success: false,
        error: `Insufficient balance. Need $${price}, have $${business?.balance ?? 0}`,
      });
    }

    // Determine max WA accounts & team members from dynamic settings
    const tierLimits: Record<string, { maxWaAccounts: number; maxTeamMembers: number }> = {
      STANDARD: { maxWaAccounts: settings.maxWaStandard, maxTeamMembers: settings.maxTeamStandard },
      PREMIUM: { maxWaAccounts: settings.maxWaPremium, maxTeamMembers: settings.maxTeamPremium },
      PLATINUM: { maxWaAccounts: settings.maxWaPlatinum, maxTeamMembers: settings.maxTeamPlatinum },
    };
    const limits = tierLimits[tier];
    const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const newBalance = business.balance - price;

    await prisma.$transaction([
      prisma.business.update({
        where: { id: businessId },
        data: { balance: newBalance, planExpiresAt },
      }),
      prisma.subscription.upsert({
        where: { businessId },
        update: { tier: tier as any, maxWaAccounts: limits.maxWaAccounts, maxTeamMembers: limits.maxTeamMembers, currentPeriodEnd: planExpiresAt },
        create: { businessId, tier: tier as any, maxWaAccounts: limits.maxWaAccounts, maxTeamMembers: limits.maxTeamMembers, currentPeriodEnd: planExpiresAt },
      }),
      prisma.balanceTransaction.create({
        data: {
          businessId,
          type: "PLAN_PURCHASE",
          amount: -price,
          balanceAfter: newBalance,
          description: `${tier} plan — 30 days`,
        },
      }),
    ]);

    return res.json({ success: true, message: `${tier} plan activated for 30 days`, data: { balance: newBalance, planExpiresAt } });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payments/webhook ───────────────────────────────────────────
// Raw body needed for HMAC — mounted before express.json() in index.ts
paymentsRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : JSON.stringify(req.body);
      const signature = (req.headers["hmac"] as string) ?? "";

      if (!verifyOxapayHmac(rawBody, signature)) {
        console.warn("[payments/webhook] Invalid HMAC — rejecting");
        return res.status(200).send("ok"); // Always 200 to OxaPay
      }

      const payload: OxapayWebhookPayload = JSON.parse(rawBody);

      // Only credit on "paid" status
      if (payload.status !== "paid") {
        console.log(`[payments/webhook] Ignoring status=${payload.status} for track=${payload.track_id}`);
        return res.status(200).send("ok");
      }

      // Extract businessId from order_id
      // Format: static_<businessId>_<network>  OR  inv_<businessId>_<timestamp>
      const parts = payload.order_id.split("_");
      const businessId = parts[1];
      if (!businessId) {
        console.warn("[payments/webhook] Cannot parse businessId from order_id:", payload.order_id);
        return res.status(200).send("ok");
      }

      // Idempotency: skip if already processed
      const existing = await prisma.balanceTransaction.findFirst({
        where: { oxapayTrackId: payload.track_id },
      });
      if (existing) {
        console.log(`[payments/webhook] Already processed track_id=${payload.track_id}`);
        return res.status(200).send("ok");
      }

      const amount = Number(payload.amount);
      const business = await prisma.business.findUnique({ where: { id: businessId }, select: { balance: true } });
      if (!business) {
        console.warn("[payments/webhook] Business not found:", businessId);
        return res.status(200).send("ok");
      }

      const newBalance = business.balance + amount;
      await prisma.$transaction([
        prisma.business.update({ where: { id: businessId }, data: { balance: newBalance } }),
        prisma.balanceTransaction.create({
          data: {
            businessId,
            type: "DEPOSIT",
            amount,
            balanceAfter: newBalance,
            description: `Crypto deposit via OxaPay (${payload.currency})`,
            oxapayTrackId: payload.track_id,
          },
        }),
      ]);

      console.log(`[payments/webhook] Credited $${amount} to business ${businessId}. New balance: $${newBalance}`);
      return res.status(200).send("ok");
    } catch (err) {
      console.error("[payments/webhook] Error:", err);
      return res.status(200).send("ok"); // Always 200 to OxaPay
    }
  }
);

