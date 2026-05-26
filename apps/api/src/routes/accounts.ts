import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { encrypt, decrypt } from "../lib/encryption";
import { verifyAccessToken, getPhoneNumbers } from "../lib/meta";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { canAddWaAccount } from "../lib/subscription";

export const accountsRouter = Router();
accountsRouter.use(requireAuth);
accountsRouter.use(requireBusiness);

const importCredentialsSchema = z.object({
  name: z.string().min(1).max(80).default("My WhatsApp Account"),
  appId: z.string().min(1),
  appSecret: z.string().min(1),
  accessToken: z.string().min(1),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
});

// GET /api/accounts — list WA accounts accessible to this user
accountsRouter.get("/", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;

    // Determine which credentials this user can access
    const member = await prisma.businessMember.findFirst({
      where: { businessId, userId: req.user!.userId },
    });

    let credentialFilter: { businessId: string; id?: { in: string[] } } = { businessId };

    if (member && member.role !== "OWNER" && member.role !== "ADMIN") {
      const access = await prisma.waAccountAccess.findMany({
        where: { businessMemberId: member.id },
        select: { waCredentialId: true },
      });
      const accessibleIds = access.map((a) => a.waCredentialId);
      credentialFilter = { businessId, id: { in: accessibleIds } };
    }

    const credentials = await prisma.waCredential.findMany({
      where: credentialFilter,
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { waAccountAccess: true } },
      },
    });

    return res.json({
      success: true,
      data: credentials.map((c) => ({
        id: c.id,
        name: c.name,
        appId: c.appId,
        wabaId: c.wabaId,
        phoneNumberId: c.phoneNumberId,
        displayPhone: c.displayPhone ?? null,
        webhookRegistered: c.webhookRegistered,
        lastVerifiedAt: c.lastVerifiedAt,
        teamAccessCount: c._count.waAccountAccess,
        // Never expose secrets
        appSecret: "••••••••",
        accessToken: "••••••••",
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/accounts/:id — single credential detail
accountsRouter.get("/:id", async (req, res, next) => {
  try {
    const cred = await prisma.waCredential.findFirst({
      where: { id: req.params.id, businessId: req.user!.businessId },
    });
    if (!cred) return res.status(404).json({ success: false, error: "Account not found" });

    return res.json({
      success: true,
      data: {
        id: cred.id,
        name: cred.name,
        appId: cred.appId,
        wabaId: cred.wabaId,
        phoneNumberId: cred.phoneNumberId,
        webhookRegistered: cred.webhookRegistered,
        lastVerifiedAt: cred.lastVerifiedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/accounts/import — import a new WA account (tier-checked)
accountsRouter.post("/import", async (req, res, next) => {
  try {
    const body = importCredentialsSchema.parse(req.body);
    const businessId = req.user!.businessId!;

    // ── Tier limit check ───────────────────────
    const check = await canAddWaAccount(businessId, prisma);
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        error: check.reason,
        current: check.current,
        limit: check.limit,
        upgradeRequired: true,
      });
    }

    // ── Verify token with Meta ─────────────────
    const verification = await verifyAccessToken(body.accessToken);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: `Meta token verification failed: ${verification.error}`,
      });
    }

    // ── Encrypt & save (upsert so re-importing preserves history) ────
    const appSecretEnc = encrypt(body.appSecret);
    const accessTokenEnc = encrypt(body.accessToken);

    const credential = await prisma.waCredential.upsert({
      where: { businessId_phoneNumberId: { businessId, phoneNumberId: body.phoneNumberId } },
      update: {
        name: body.name,
        appId: body.appId,
        appSecretEnc,
        accessTokenEnc,
        wabaId: body.wabaId,
        lastVerifiedAt: new Date(),
      },
      create: {
        businessId,
        name: body.name,
        appId: body.appId,
        appSecretEnc,
        accessTokenEnc,
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
        lastVerifiedAt: new Date(),
      },
    });

    // ── Give owner access to this account (skip if already exists) ─
    const ownerMember = await prisma.businessMember.findFirst({
      where: { businessId, role: "OWNER" },
    });
    if (ownerMember) {
      await prisma.waAccountAccess.upsert({
        where: { businessMemberId_waCredentialId: { businessMemberId: ownerMember.id, waCredentialId: credential.id } },
        update: {},
        create: { businessMemberId: ownerMember.id, waCredentialId: credential.id },
      });
    }

    // ── Sync phone numbers from Meta ──────────
    const phones = await getPhoneNumbers({ wabaId: body.wabaId, accessToken: body.accessToken });
    if (phones.success && phones.phoneNumbers) {
      for (const phone of phones.phoneNumbers) {
        await prisma.phoneNumber.upsert({
          where: { phoneNumberId: phone.id },
          update: {
            displayPhone: phone.display_phone_number,
            verifiedName: phone.verified_name,
            qualityRating: phone.quality_rating,
            status: phone.status,
          },
          create: {
            businessId,
            phoneNumberId: phone.id,
            displayPhone: phone.display_phone_number,
            verifiedName: phone.verified_name,
            qualityRating: phone.quality_rating,
            status: phone.status,
          },
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "WhatsApp account imported and verified successfully",
      data: {
        id: credential.id,
        name: credential.name,
        appId: credential.appId,
        wabaId: credential.wabaId,
        phoneNumbers: phones.phoneNumbers ?? [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/accounts/:id — rename a credential
accountsRouter.patch("/:id", async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(1).max(80) }).parse(req.body);
    const cred = await prisma.waCredential.findFirst({
      where: { id: req.params.id, businessId: req.user!.businessId },
    });
    if (!cred) return res.status(404).json({ success: false, error: "Account not found" });

    const updated = await prisma.waCredential.update({
      where: { id: req.params.id },
      data: { name },
    });
    return res.json({ success: true, data: { id: updated.id, name: updated.name } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/accounts/:id — remove a specific WA account
accountsRouter.delete("/:id", async (req, res, next) => {
  try {
    const cred = await prisma.waCredential.findFirst({
      where: { id: req.params.id, businessId: req.user!.businessId },
    });
    if (!cred) return res.status(404).json({ success: false, error: "Account not found" });

    await prisma.waCredential.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Account removed" });
  } catch (err) {
    next(err);
  }
});

// GET /api/accounts/phone-numbers — all phone numbers across all WA accounts
accountsRouter.get("/phone-numbers/all", async (req, res, next) => {
  try {
    const phones = await prisma.phoneNumber.findMany({
      where: { businessId: req.user!.businessId },
    });
    return res.json({ success: true, data: phones });
  } catch (err) {
    next(err);
  }
});

// Helper for internal use: get decrypted access token by credential ID
export async function getDecryptedAccessToken(credentialId: string): Promise<string | null> {
  const cred = await prisma.waCredential.findUnique({ where: { id: credentialId } });
  if (!cred) return null;
  return decrypt(cred.accessTokenEnc);
}
