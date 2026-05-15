import { Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { getOrCreateSubscription, TIER_LIMITS, TIER_DISPLAY } from "../lib/subscription";

export const subscriptionsRouter = Router();
subscriptionsRouter.use(requireAuth);
subscriptionsRouter.use(requireBusiness);

// GET /api/subscription — get current tier, limits, and usage
subscriptionsRouter.get("/", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const [sub, waCount, memberCount] = await Promise.all([
      getOrCreateSubscription(businessId, prisma),
      prisma.waCredential.count({ where: { businessId } }),
      prisma.businessMember.count({ where: { businessId } }),
    ]);

    return res.json({
      success: true,
      data: {
        tier: sub.tier,
        display: TIER_DISPLAY[sub.tier],
        limits: {
          maxWaAccounts: sub.maxWaAccounts,
          maxTeamMembers: sub.maxTeamMembers,
        },
        usage: {
          waAccounts: waCount,
          teamMembers: memberCount,
        },
        canAddWaAccount: waCount < sub.maxWaAccounts,
        canAddTeamMember: memberCount < sub.maxTeamMembers,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/subscription/tiers — public: all tier info for pricing page
subscriptionsRouter.get("/tiers", async (_req, res) => {
  const tiers = [
    {
      key: "FREE",
      label: "Free",
      price: 0,
      priceLabel: "$0",
      period: "forever",
      description: "Perfect for trying it out",
      maxWaAccounts: 1,
      maxTeamMembers: 1,
      features: [
        "1 WhatsApp account",
        "1 team member (owner only)",
        "All 11 webhook fields",
        "Message inbox",
        "Account event logs",
        "Community support",
      ],
      cta: "Get started free",
      highlighted: false,
    },
    {
      key: "STANDARD",
      label: "Standard",
      price: 29,
      priceLabel: "$29",
      period: "per month",
      description: "For growing businesses",
      maxWaAccounts: 10,
      maxTeamMembers: 2,
      features: [
        "10 WhatsApp accounts",
        "2 team members",
        "All 11 webhook fields",
        "Message inbox",
        "Account event logs",
        "Per-account team access control",
        "Email support",
      ],
      cta: "Start free trial",
      highlighted: false,
    },
    {
      key: "PREMIUM",
      label: "Premium",
      price: 99,
      priceLabel: "$99",
      period: "per month",
      description: "For agencies & power users",
      maxWaAccounts: 100,
      maxTeamMembers: 4,
      features: [
        "100 WhatsApp accounts",
        "4 team members",
        "All 11 webhook fields",
        "Message inbox",
        "Account event logs",
        "Per-account team access control",
        "Priority support",
        "Advanced analytics (coming soon)",
      ],
      cta: "Start free trial",
      highlighted: true,
    },
    {
      key: "PLATINUM",
      label: "Platinum",
      price: null,
      priceLabel: "Custom",
      period: "contact us",
      description: "For enterprises at scale",
      maxWaAccounts: null,
      maxTeamMembers: null,
      features: [
        "Unlimited WhatsApp accounts",
        "Unlimited team members",
        "All 11 webhook fields",
        "Message inbox",
        "Account event logs",
        "Per-account team access control",
        "Dedicated account manager",
        "SLA guarantee",
        "Custom integrations",
        "On-premise deployment option",
      ],
      cta: "Contact sales",
      highlighted: false,
    },
  ];

  return res.json({ success: true, data: tiers });
});

// POST /api/subscription/upgrade — mock upgrade (wire to Stripe later)
subscriptionsRouter.post("/upgrade", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const { tier } = req.body as { tier: "FREE" | "STANDARD" | "PREMIUM" | "PLATINUM" };

    if (!["FREE", "STANDARD", "PREMIUM", "PLATINUM"].includes(tier)) {
      return res.status(400).json({ success: false, error: "Invalid tier" });
    }

    if (tier === "PLATINUM") {
      return res.status(400).json({
        success: false,
        error: "Please contact sales for Platinum plan",
        contactEmail: "sales@yourdomain.com",
      });
    }

    const limits = TIER_LIMITS[tier];
    const sub = await prisma.subscription.upsert({
      where: { businessId },
      update: {
        tier,
        maxWaAccounts: limits.maxWaAccounts,
        maxTeamMembers: limits.maxTeamMembers,
      },
      create: {
        businessId,
        tier,
        maxWaAccounts: limits.maxWaAccounts,
        maxTeamMembers: limits.maxTeamMembers,
      },
    });

    return res.json({
      success: true,
      message: `Upgraded to ${tier}`,
      data: sub,
    });
  } catch (err) {
    next(err);
  }
});
