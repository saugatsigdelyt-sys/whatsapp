import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { encrypt, decrypt } from "../lib/encryption";
import { getPhoneNumbers } from "../lib/meta";

export const adminRouter = Router();
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/users — list all users with their business & subscription
adminRouter.get("/users", async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const search = (req.query.search as string) ?? "";

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          businessMembers: {
            orderBy: { createdAt: "asc" },
            take: 1,
            include: {
              business: {
                include: { subscription: true },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      success: true,
      data: users.map((u) => {
        const bm = u.businessMembers[0];
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt,
          business: bm
            ? {
                id: bm.business.id,
                name: bm.business.name,
                balance: bm.business.balance,
                planExpiresAt: bm.business.planExpiresAt,
                tier: bm.business.subscription?.tier ?? "FREE",
              }
            : null,
        };
      }),
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// PATCH /api/admin/users/:businessId/plan — change a business's subscription tier
adminRouter.patch("/users/:businessId/plan", async (req, res, next) => {
  try {
    const { tier } = z
      .object({ tier: z.enum(["FREE", "STANDARD", "PREMIUM", "PLATINUM"]) })
      .parse(req.body);

    // Read live limits from PlatformSettings; fall back to sensible defaults.
    // 999999 = unlimited (handled by canAddWaAccount as no-limit).
    const ps = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
    const tierLimits: Record<string, { maxWaAccounts: number; maxTeamMembers: number }> = {
      FREE:     { maxWaAccounts: ps?.maxWaFree     ?? 1,      maxTeamMembers: ps?.maxTeamFree     ?? 1      },
      STANDARD: { maxWaAccounts: ps?.maxWaStandard ?? 10,     maxTeamMembers: ps?.maxTeamStandard ?? 2      },
      PREMIUM:  { maxWaAccounts: ps?.maxWaPremium  ?? 100,    maxTeamMembers: ps?.maxTeamPremium  ?? 4      },
      PLATINUM: { maxWaAccounts: ps?.maxWaPlatinum ?? 999999, maxTeamMembers: ps?.maxTeamPlatinum ?? 999999 },
    };
    const limits = tierLimits[tier];
    const planExpiresAt = tier === "FREE" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.subscription.upsert({
        where: { businessId: req.params.businessId },
        update: { tier: tier as any, ...limits, currentPeriodEnd: planExpiresAt },
        create: { businessId: req.params.businessId, tier: tier as any, ...limits, currentPeriodEnd: planExpiresAt },
      }),
      prisma.business.update({
        where: { id: req.params.businessId },
        data: { planExpiresAt },
      }),
    ]);

    return res.json({ success: true, message: `Plan updated to ${tier}` });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BALANCE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// PATCH /api/admin/users/:businessId/balance — credit or debit balance
adminRouter.patch("/users/:businessId/balance", async (req, res, next) => {
  try {
    const { amount, description } = z
      .object({ amount: z.number(), description: z.string().optional() })
      .parse(req.body);

    const business = await prisma.business.findUnique({
      where: { id: req.params.businessId },
      select: { balance: true },
    });
    if (!business) return res.status(404).json({ success: false, error: "Business not found" });

    const newBalance = business.balance + amount;
    if (newBalance < 0) {
      return res.status(400).json({ success: false, error: "Balance cannot go below zero" });
    }

    await prisma.$transaction([
      prisma.business.update({ where: { id: req.params.businessId }, data: { balance: newBalance } }),
      prisma.balanceTransaction.create({
        data: {
          businessId: req.params.businessId,
          type: amount >= 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
          amount,
          balanceAfter: newBalance,
          description: description ?? (amount >= 0 ? "Admin credit" : "Admin debit"),
        },
      }),
    ]);

    return res.json({ success: true, data: { balance: newBalance } });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROLE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// PATCH /api/admin/users/:userId/role — promote/demote user system role
adminRouter.patch("/users/:userId/role", async (req, res, next) => {
  try {
    const { role } = z.object({ role: z.enum(["SUPER_ADMIN", "MEMBER"]) }).parse(req.body);
    const user = await prisma.user.update({ where: { id: req.params.userId }, data: { role: role as any } });
    return res.json({ success: true, data: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM PHONES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/platform-phones
adminRouter.get("/platform-phones", async (_req, res, next) => {
  try {
    const phones = await prisma.platformPhone.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignments: { include: { business: { select: { id: true, name: true } } } },
      },
    });
    return res.json({ success: true, data: phones.map((p) => ({ ...p, appSecretEnc: undefined, accessTokenEnc: undefined })) });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/platform-phones — import a new platform phone
adminRouter.post("/platform-phones", async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1).max(80),
      appId: z.string().min(1),
      appSecret: z.string().min(1),
      accessToken: z.string().min(1),
      wabaId: z.string().min(1),
      phoneNumberId: z.string().min(1),
      displayPhone: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    const phone = await prisma.platformPhone.create({
      data: {
        name: body.name,
        appId: body.appId,
        appSecretEnc: encrypt(body.appSecret),
        accessTokenEnc: encrypt(body.accessToken),
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
        displayPhone: body.displayPhone,
        notes: body.notes,
      },
    });
    return res.status(201).json({ success: true, data: { id: phone.id, name: phone.name, displayPhone: phone.displayPhone } });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/platform-phones/bulk — bulk import from CSV data
adminRouter.post("/platform-phones/bulk", async (req, res, next) => {
  try {
    const phoneSchema = z.object({
      name: z.string().min(1).max(80),
      appId: z.string().min(1),
      appSecret: z.string().min(1),
      accessToken: z.string().min(1),
      wabaId: z.string().min(1),
      phoneNumberId: z.string().min(1),
      displayPhone: z.string().optional(),
      notes: z.string().optional(),
    });
    const { phones } = z.object({ phones: z.array(phoneSchema).min(1).max(500) }).parse(req.body);

    const results: { success: boolean; phoneNumberId: string; error?: string }[] = [];
    for (const p of phones) {
      try {
        await prisma.platformPhone.create({
          data: {
            name: p.name,
            appId: p.appId,
            appSecretEnc: encrypt(p.appSecret),
            accessTokenEnc: encrypt(p.accessToken),
            wabaId: p.wabaId,
            phoneNumberId: p.phoneNumberId,
            displayPhone: p.displayPhone,
            notes: p.notes,
          },
        });
        results.push({ success: true, phoneNumberId: p.phoneNumberId });
      } catch (err: any) {
        results.push({ success: false, phoneNumberId: p.phoneNumberId, error: err.message });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    return res.status(201).json({
      success: true,
      message: `Imported ${succeeded} phones${failed > 0 ? `, ${failed} failed` : ""}`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/platform-phones/:id/assign — assign to a business
adminRouter.post("/platform-phones/:id/assign", async (req, res, next) => {
  try {
    const { businessId } = z.object({ businessId: z.string().min(1) }).parse(req.body);
    await prisma.platformPhoneAssignment.upsert({
      where: { platformPhoneId_businessId: { platformPhoneId: req.params.id, businessId } },
      update: {},
      create: { platformPhoneId: req.params.id, businessId },
    });
    return res.json({ success: true, message: "Phone assigned" });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/platform-phones/:id/assign/:businessId — unassign
adminRouter.delete("/platform-phones/:id/assign/:businessId", async (req, res, next) => {
  try {
    await prisma.platformPhoneAssignment.deleteMany({
      where: { platformPhoneId: req.params.id, businessId: req.params.businessId },
    });
    return res.json({ success: true, message: "Assignment removed" });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/platform-phones/:id
adminRouter.delete("/platform-phones/:id", async (req, res, next) => {
  try {
    await prisma.platformPhone.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Platform phone removed" });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN'S OWN WA ACCOUNTS ("My Accounts")
// ─────────────────────────────────────────────────────────────────────────────

type CredHealth = "HEALTHY" | "ERROR" | "LOCKED";

function computeCredHealth(cred: {
  webhookError: string | null;
  phoneNumbers: { status: string | null; healthError: string | null }[];
}): CredHealth {
  if (cred.webhookError) return "ERROR";
  for (const p of cred.phoneNumbers) {
    if (p.healthError) return "ERROR";
    const s = p.status?.toUpperCase();
    if (s === "BANNED") return "LOCKED";
    if (s === "FLAGGED" || s === "RESTRICTED") return "ERROR";
  }
  return "HEALTHY";
}

// GET /api/admin/my-accounts
adminRouter.get("/my-accounts", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const healthFilter = req.query.health as string | undefined;

    const credentials = await prisma.waCredential.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      include: {
        phoneNumbers: {
          select: { id: true, displayPhone: true, status: true, qualityRating: true, healthError: true },
        },
      },
    });

    const withHealth = credentials.map((c) => ({ ...c, health: computeCredHealth(c) }));
    const summary = {
      healthy: withHealth.filter((c) => c.health === "HEALTHY").length,
      error:   withHealth.filter((c) => c.health === "ERROR").length,
      locked:  withHealth.filter((c) => c.health === "LOCKED").length,
    };

    const filtered = healthFilter && ["HEALTHY", "ERROR", "LOCKED"].includes(healthFilter)
      ? withHealth.filter((c) => c.health === healthFilter)
      : withHealth;

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return res.json({
      success: true,
      data: paginated.map((c) => ({
        id: c.id, name: c.name, appId: c.appId, wabaId: c.wabaId,
        phoneNumberId: c.phoneNumberId, webhookRegistered: c.webhookRegistered,
        webhookError: c.webhookError, lastVerifiedAt: c.lastVerifiedAt,
        health: c.health,
        phoneNumbers: c.phoneNumbers,
      })),
      total, page, limit, summary,
    });
  } catch (err) { next(err); }
});

// POST /api/admin/my-accounts/bulk-delete — MUST be before /:id routes
adminRouter.post("/my-accounts/bulk-delete", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
    await prisma.waCredential.deleteMany({ where: { id: { in: ids }, businessId } });
    return res.json({ success: true, message: `Deleted ${ids.length} account(s)` });
  } catch (err) { next(err); }
});

// POST /api/admin/my-accounts/refresh-all — MUST be before /:id routes
adminRouter.post("/my-accounts/refresh-all", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const credentials = await prisma.waCredential.findMany({ where: { businessId } });

    let refreshed = 0;
    const errors: Array<{ credentialId: string; name: string; error: string }> = [];

    for (const cred of credentials) {
      const accessToken = decrypt(cred.accessTokenEnc);
      const result = await getPhoneNumbers({ wabaId: cred.wabaId, accessToken });

      if (result.success && result.phoneNumbers) {
        for (const phone of result.phoneNumbers) {
          await prisma.phoneNumber.upsert({
            where: { phoneNumberId: phone.id },
            update: {
              displayPhone: phone.display_phone_number, verifiedName: phone.verified_name,
              qualityRating: phone.quality_rating, status: phone.status,
              healthError: null, waCredentialId: cred.id,
            },
            create: {
              businessId, phoneNumberId: phone.id, displayPhone: phone.display_phone_number,
              verifiedName: phone.verified_name, qualityRating: phone.quality_rating,
              status: phone.status, waCredentialId: cred.id,
            },
          });
          refreshed++;
        }
        await prisma.waCredential.update({
          where: { id: cred.id },
          data: { webhookError: null, lastVerifiedAt: new Date() },
        });
      } else {
        await prisma.waCredential.update({
          where: { id: cred.id },
          data: { webhookError: result.error ?? "Failed to reach Meta API" },
        });
        await prisma.phoneNumber.updateMany({
          where: { businessId, waCredentialId: cred.id },
          data: { healthError: result.error ?? "Failed to reach Meta API" },
        });
        errors.push({ credentialId: cred.id, name: cred.name, error: result.error ?? "Unknown error" });
      }
    }

    return res.json({
      success: true,
      message: `Refreshed ${refreshed} phone number(s) across ${credentials.length} account(s).${errors.length ? ` ${errors.length} account(s) had errors.` : ""}`,
      refreshed,
      errors,
    });
  } catch (err) { next(err); }
});

// POST /api/admin/my-accounts/:id/refresh
adminRouter.post("/my-accounts/:id/refresh", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const cred = await prisma.waCredential.findFirst({
      where: { id: req.params.id, businessId },
    });
    if (!cred) return res.status(404).json({ success: false, error: "Account not found" });

    const accessToken = decrypt(cred.accessTokenEnc);
    const result = await getPhoneNumbers({ wabaId: cred.wabaId, accessToken });

    if (result.success && result.phoneNumbers) {
      for (const phone of result.phoneNumbers) {
        await prisma.phoneNumber.upsert({
          where: { phoneNumberId: phone.id },
          update: {
            displayPhone: phone.display_phone_number, verifiedName: phone.verified_name,
            qualityRating: phone.quality_rating, status: phone.status, healthError: null,
            waCredentialId: cred.id,
          },
          create: {
            businessId, phoneNumberId: phone.id, displayPhone: phone.display_phone_number,
            verifiedName: phone.verified_name, qualityRating: phone.quality_rating,
            status: phone.status, waCredentialId: cred.id,
          },
        });
      }
      await prisma.waCredential.update({
        where: { id: cred.id },
        data: { webhookError: null, lastVerifiedAt: new Date() },
      });
    } else {
      await prisma.waCredential.update({
        where: { id: cred.id },
        data: { webhookError: result.error ?? "Failed to reach Meta API" },
      });
    }
    return res.json({ success: true, message: "Health refreshed" });
  } catch (err) { next(err); }
});

// DELETE /api/admin/my-accounts/:id
adminRouter.delete("/my-accounts/:id", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const cred = await prisma.waCredential.findFirst({
      where: { id: req.params.id, businessId },
    });
    if (!cred) return res.status(404).json({ success: false, error: "Account not found" });
    await prisma.waCredential.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Account deleted" });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/announcements
adminRouter.get("/announcements", async (_req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
    return res.json({ success: true, data: announcements });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/announcements
adminRouter.post("/announcements", async (req, res, next) => {
  try {
    const body = z.object({
      title: z.string().min(1).max(100),
      body: z.string().min(1),
      type: z.enum(["info", "warning", "success", "error"]).default("info"),
      active: z.boolean().default(true),
      startsAt: z.string().datetime().optional(),
      endsAt: z.string().datetime().optional(),
    }).parse(req.body);

    const ann = await prisma.announcement.create({
      data: {
        title: body.title,
        body: body.body,
        type: body.type,
        active: body.active,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
      },
    });
    return res.status(201).json({ success: true, data: ann });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/announcements/:id
adminRouter.patch("/announcements/:id", async (req, res, next) => {
  try {
    const body = z.object({
      title: z.string().min(1).max(100).optional(),
      body: z.string().min(1).optional(),
      type: z.enum(["info", "warning", "success", "error"]).optional(),
      active: z.boolean().optional(),
      startsAt: z.string().datetime().nullable().optional(),
      endsAt: z.string().datetime().nullable().optional(),
    }).parse(req.body);

    const ann = await prisma.announcement.update({
      where: { id: req.params.id },
      data: {
        ...body,
        startsAt: body.startsAt !== undefined ? (body.startsAt ? new Date(body.startsAt) : null) : undefined,
        endsAt: body.endsAt !== undefined ? (body.endsAt ? new Date(body.endsAt) : null) : undefined,
      },
    });
    return res.json({ success: true, data: ann });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/announcements/:id
adminRouter.delete("/announcements/:id", async (req, res, next) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Announcement deleted" });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS / PRICING
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/settings
adminRouter.get("/settings", async (_req, res, next) => {
  try {
    let settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
    if (!settings) {
      settings = await prisma.platformSettings.create({ data: { id: "singleton", updatedAt: new Date() } });
    }
    return res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/settings
adminRouter.patch("/settings", async (req, res, next) => {
  try {
    const body = z.object({
      priceStandard: z.number().min(0).optional(),
      pricePremium: z.number().min(0).optional(),
      pricePlatinum: z.number().min(0).optional(),
      minDeposit: z.number().min(1).optional(),
      maxWaFree: z.number().int().min(0).optional(),
      maxWaStandard: z.number().int().min(0).optional(),
      maxWaPremium: z.number().int().min(0).optional(),
      maxWaPlatinum: z.number().int().min(0).optional(),
      maxTeamFree: z.number().int().min(0).optional(),
      maxTeamStandard: z.number().int().min(0).optional(),
      maxTeamPremium: z.number().int().min(0).optional(),
      maxTeamPlatinum: z.number().int().min(0).optional(),
      registrationEnabled: z.boolean().optional(),
    }).parse(req.body);

    const settings = await prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: { ...body, updatedAt: new Date() },
      create: { id: "singleton", ...body, updatedAt: new Date() },
    });
    return res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: active announcement for dashboard banner
// ─────────────────────────────────────────────────────────────────────────────
export const publicAnnouncementRouter = Router();
publicAnnouncementRouter.get("/active", async (_req, res, next) => {
  try {
    const now = new Date();
    const ann = await prisma.announcement.findFirst({
      where: {
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: ann });
  } catch (err) {
    next(err);
  }
});
