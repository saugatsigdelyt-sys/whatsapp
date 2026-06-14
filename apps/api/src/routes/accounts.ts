import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { encrypt, decrypt } from "../lib/encryption";
import { verifyAccessToken, getPhoneNumbers, registerWebhook } from "../lib/meta";
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

// ── Helpers ─────────────────────────────────────────────────────────────────

async function autoRegisterWebhook(
  credential: { id: string; appId: string; appSecretEnc: string; accessTokenEnc: string; wabaId: string },
  businessId: string
): Promise<{ success: boolean; error?: string }> {
  const callbackUrl = process.env.WEBHOOK_CALLBACK_URL ?? `${process.env.WEBHOOK_BASE_URL}/webhook`;
  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN!;
  const appSecret = decrypt(credential.appSecretEnc);
  const accessToken = decrypt(credential.accessTokenEnc);

  const result = await registerWebhook({
    appId: credential.appId,
    appSecret,
    wabaId: credential.wabaId,
    accessToken,
    callbackUrl,
    verifyToken,
  });

  if (result.success) {
    await prisma.waCredential.update({
      where: { id: credential.id },
      data: { webhookRegistered: true, webhookError: null },
    });
    // Upsert webhook subscription record
    await prisma.webhookSubscription.upsert({
      where: { businessId },
      update: {
        accountAlerts: true, accountReviewUpdate: true, accountUpdate: true,
        businessCapacityUpdate: true, messageTemplateQualityUpdate: true,
        messageTemplateStatusUpdate: true, messages: true,
        phoneNumberNameUpdate: true, phoneNumberQualityUpdate: true,
        security: true, templateCategoryUpdate: true,
      },
      create: {
        businessId,
        accountAlerts: true, accountReviewUpdate: true, accountUpdate: true,
        businessCapacityUpdate: true, messageTemplateQualityUpdate: true,
        messageTemplateStatusUpdate: true, messages: true,
        phoneNumberNameUpdate: true, phoneNumberQualityUpdate: true,
        security: true, templateCategoryUpdate: true,
      },
    });
  } else {
    await prisma.waCredential.update({
      where: { id: credential.id },
      data: { webhookRegistered: false, webhookError: result.error ?? "Unknown error" },
    });
  }

  return result;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/accounts
accountsRouter.get("/", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const member = await prisma.businessMember.findFirst({
      where: { businessId, userId: req.user!.userId },
    });

    let credentialFilter: { businessId: string; id?: { in: string[] } } = { businessId };
    if (member && member.role !== "OWNER" && member.role !== "ADMIN") {
      const access = await prisma.waAccountAccess.findMany({
        where: { businessMemberId: member.id },
        select: { waCredentialId: true },
      });
      credentialFilter = { businessId, id: { in: access.map((a) => a.waCredentialId) } };
    }

    const credentials = await prisma.waCredential.findMany({
      where: credentialFilter,
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { waAccountAccess: true } } },
    });

    return res.json({
      success: true,
      data: credentials.map((c) => ({
        id: c.id, name: c.name, appId: c.appId, wabaId: c.wabaId,
        phoneNumberId: c.phoneNumberId, displayPhone: c.displayPhone ?? null,
        webhookRegistered: c.webhookRegistered, webhookError: c.webhookError ?? null,
        lastVerifiedAt: c.lastVerifiedAt, teamAccessCount: c._count.waAccountAccess,
        appSecret: "••••••••", accessToken: "••••••••",
      })),
    });
  } catch (err) { next(err); }
});

// GET /api/accounts/:id
accountsRouter.get("/:id", async (req, res, next) => {
  try {
    const cred = await prisma.waCredential.findFirst({
      where: { id: req.params.id, businessId: req.user!.businessId },
    });
    if (!cred) return res.status(404).json({ success: false, error: "Account not found" });
    return res.json({
      success: true,
      data: {
        id: cred.id, name: cred.name, appId: cred.appId, wabaId: cred.wabaId,
        phoneNumberId: cred.phoneNumberId, webhookRegistered: cred.webhookRegistered,
        webhookError: cred.webhookError ?? null, lastVerifiedAt: cred.lastVerifiedAt,
      },
    });
  } catch (err) { next(err); }
});

// POST /api/accounts/import — import credential + auto-register webhook
accountsRouter.post("/import", async (req, res, next) => {
  try {
    const body = importCredentialsSchema.parse(req.body);
    const businessId = req.user!.businessId!;

    const check = await canAddWaAccount(businessId, prisma);
    if (!check.allowed) {
      return res.status(403).json({
        success: false, error: check.reason,
        current: check.current, limit: check.limit, upgradeRequired: true,
      });
    }

    // Verify token with Meta
    const verification = await verifyAccessToken(body.accessToken);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: `Meta token verification failed: ${verification.error}`,
      });
    }

    const appSecretEnc = encrypt(body.appSecret);
    const accessTokenEnc = encrypt(body.accessToken);

    const credential = await prisma.waCredential.upsert({
      where: { businessId_phoneNumberId: { businessId, phoneNumberId: body.phoneNumberId } },
      update: { name: body.name, appId: body.appId, appSecretEnc, accessTokenEnc, wabaId: body.wabaId, lastVerifiedAt: new Date() },
      create: { businessId, name: body.name, appId: body.appId, appSecretEnc, accessTokenEnc, wabaId: body.wabaId, phoneNumberId: body.phoneNumberId, lastVerifiedAt: new Date() },
    });

    // Give owner access
    const ownerMember = await prisma.businessMember.findFirst({ where: { businessId, role: "OWNER" } });
    if (ownerMember) {
      await prisma.waAccountAccess.upsert({
        where: { businessMemberId_waCredentialId: { businessMemberId: ownerMember.id, waCredentialId: credential.id } },
        update: {}, create: { businessMemberId: ownerMember.id, waCredentialId: credential.id },
      });
    }

    // Sync phone numbers from Meta + transfer ownership of any previously claimed phones
    const phones = await getPhoneNumbers({ wabaId: body.wabaId, accessToken: body.accessToken });
    // Build the list of phoneNumberIds we are taking ownership of.
    // Always include the explicitly-provided phoneNumberId; add any extras Meta returns.
    const phoneIdsToTransfer = phones.success && phones.phoneNumbers
      ? [...new Set([body.phoneNumberId, ...phones.phoneNumbers.map((p) => p.id)])]
      : [body.phoneNumberId];

    if (phones.success && phones.phoneNumbers) {
      for (const phone of phones.phoneNumbers) {
        await prisma.phoneNumber.upsert({
          where: { phoneNumberId: phone.id },
          update: {
            businessId,                              // ← transfer ownership to importing user
            displayPhone: phone.display_phone_number, verifiedName: phone.verified_name,
            qualityRating: phone.quality_rating, status: phone.status,
            waCredentialId: credential.id, healthError: null,
          },
          create: {
            businessId, phoneNumberId: phone.id, displayPhone: phone.display_phone_number,
            verifiedName: phone.verified_name, qualityRating: phone.quality_rating,
            status: phone.status, waCredentialId: credential.id,
          },
        });
      }
    }

    // ── Clean up stale credentials from other businesses ──────────────────────
    // Any credential in another business that claimed one of these phoneNumberIds
    // is now stale.  We transfer its conversations/messages to us, then delete it.
    for (const pid of phoneIdsToTransfer) {
      const oldCreds = await prisma.waCredential.findMany({
        where: { phoneNumberId: pid, businessId: { not: businessId } },
        select: { id: true, businessId: true },
      });

      for (const oldCred of oldCreds) {
        console.log(`[import] Transferring phone ${pid} from business ${oldCred.businessId} → ${businessId}`);

        // Find all conversations under the old credential
        const oldConvs = await prisma.conversation.findMany({
          where: { waCredentialId: oldCred.id },
          select: { id: true, contactPhone: true },
        });

        for (const oldConv of oldConvs) {
          // Check if new credential already has a conversation with this contactPhone
          const duplicate = await prisma.conversation.findUnique({
            where: { waCredentialId_contactPhone: { waCredentialId: credential.id, contactPhone: oldConv.contactPhone } },
            select: { id: true },
          });

          if (duplicate) {
            // Merge: move messages into the existing conversation
            await prisma.message.updateMany({
              where: { conversationId: oldConv.id },
              data: { conversationId: duplicate.id, businessId },
            });
            // Delete the now-empty old conversation
            await prisma.conversation.delete({ where: { id: oldConv.id } });
          } else {
            // Transfer conversation to new credential + business
            await prisma.message.updateMany({
              where: { conversationId: oldConv.id },
              data: { businessId },
            });
            await prisma.conversation.update({
              where: { id: oldConv.id },
              data: { businessId, waCredentialId: credential.id },
            });
          }
        }

        // Transfer any orphan messages that referenced old business but have no conversation
        await prisma.message.updateMany({
          where: { businessId: oldCred.businessId, conversationId: null },
          data: { businessId },
        });

        // Clean up templates and bulk jobs that would block deletion
        await prisma.messageTemplate.deleteMany({ where: { waCredentialId: oldCred.id } });
        await prisma.bulkSendJob.deleteMany({ where: { waCredentialId: oldCred.id } });

        // Delete old credential (WaAccountAccess rows cascade automatically)
        await prisma.waCredential.delete({ where: { id: oldCred.id } });
        console.log(`[import] Deleted stale credential ${oldCred.id} from business ${oldCred.businessId}`);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Auto-register webhook (non-fatal if it fails)
    let webhookStatus: { success: boolean; error?: string } = { success: false, error: "Not attempted" };
    try {
      webhookStatus = await autoRegisterWebhook(credential, businessId);
    } catch (webhookErr: any) {
      console.error("[import] Auto-webhook registration failed:", webhookErr?.message);
      webhookStatus = { success: false, error: webhookErr?.message ?? "Webhook registration failed" };
    }

    return res.status(201).json({
      success: true,
      message: webhookStatus.success
        ? "WhatsApp account imported and webhook registered successfully"
        : `Account imported. Webhook registration failed: ${webhookStatus.error}`,
      webhookRegistered: webhookStatus.success,
      webhookError: webhookStatus.success ? null : webhookStatus.error,
      data: { id: credential.id, name: credential.name, appId: credential.appId, wabaId: credential.wabaId, phoneNumbers: phones.phoneNumbers ?? [] },
    });
  } catch (err) { next(err); }
});

// POST /api/accounts/:id/register-webhook — retry webhook for a specific credential
accountsRouter.post("/:id/register-webhook", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const cred = await prisma.waCredential.findFirst({
      where: { id: req.params.id, businessId },
    });
    if (!cred) return res.status(404).json({ success: false, error: "Account not found" });

    const result = await autoRegisterWebhook(cred, businessId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.json({ success: true, message: "Webhook registered successfully" });
  } catch (err) { next(err); }
});

// PATCH /api/accounts/:id — rename
accountsRouter.patch("/:id", async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(1).max(80) }).parse(req.body);
    const cred = await prisma.waCredential.findFirst({
      where: { id: req.params.id, businessId: req.user!.businessId },
    });
    if (!cred) return res.status(404).json({ success: false, error: "Account not found" });
    const updated = await prisma.waCredential.update({ where: { id: req.params.id }, data: { name } });
    return res.json({ success: true, data: { id: updated.id, name: updated.name } });
  } catch (err) { next(err); }
});

// DELETE /api/accounts/:id
accountsRouter.delete("/:id", async (req, res, next) => {
  try {
    const cred = await prisma.waCredential.findFirst({
      where: { id: req.params.id, businessId: req.user!.businessId },
    });
    if (!cred) return res.status(404).json({ success: false, error: "Account not found" });
    await prisma.waCredential.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Account removed" });
  } catch (err) { next(err); }
});

// GET /api/accounts/phone-numbers/all — all phone numbers with credential info
accountsRouter.get("/phone-numbers/all", async (req, res, next) => {
  try {
    const phones = await prisma.phoneNumber.findMany({
      where: { businessId: req.user!.businessId },
      include: {
        waCredential: {
          select: { id: true, name: true, webhookRegistered: true, webhookError: true, appId: true, wabaId: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return res.json({ success: true, data: phones });
  } catch (err) { next(err); }
});

// POST /api/accounts/phone-numbers/refresh — re-query Meta for all numbers
accountsRouter.post("/phone-numbers/refresh", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const credentials = await prisma.waCredential.findMany({ where: { businessId } });

    let refreshed = 0;
    let errors: Array<{ credentialId: string; name: string; error: string }> = [];

    for (const cred of credentials) {
      const accessToken = decrypt(cred.accessTokenEnc);
      const result = await getPhoneNumbers({ wabaId: cred.wabaId, accessToken });

      if (result.success && result.phoneNumbers) {
        for (const phone of result.phoneNumbers) {
          await prisma.phoneNumber.upsert({
            where: { phoneNumberId: phone.id },
            update: {
              businessId,                              // ← keep ownership correct on refresh
              displayPhone: phone.display_phone_number, verifiedName: phone.verified_name,
              qualityRating: phone.quality_rating, status: phone.status,
              waCredentialId: cred.id, healthError: null,
            },
            create: {
              businessId, phoneNumberId: phone.id, displayPhone: phone.display_phone_number,
              verifiedName: phone.verified_name, qualityRating: phone.quality_rating,
              status: phone.status, waCredentialId: cred.id,
            },
          });
          refreshed++;
        }
      } else {
        // Mark all phone numbers for this credential as having a health error
        await prisma.phoneNumber.updateMany({
          where: { businessId, waCredentialId: cred.id },
          data: { healthError: result.error ?? "Failed to reach Meta API" },
        });
        errors.push({ credentialId: cred.id, name: cred.name, error: result.error ?? "Unknown error" });
      }
    }

    const phones = await prisma.phoneNumber.findMany({
      where: { businessId },
      include: {
        waCredential: {
          select: { id: true, name: true, webhookRegistered: true, webhookError: true, appId: true, wabaId: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.json({
      success: true,
      message: `Refreshed ${refreshed} phone numbers. ${errors.length} credential(s) had errors.`,
      data: phones,
      errors,
    });
  } catch (err) { next(err); }
});

// GET /api/accounts/phone-numbers/export — CSV export (re-importable format)
accountsRouter.get("/phone-numbers/export", async (req, res, next) => {
  try {
    const phones = await prisma.phoneNumber.findMany({
      where: { businessId: req.user!.businessId },
      include: {
        waCredential: {
          select: { name: true, appId: true, wabaId: true, webhookRegistered: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Re-importable format: appSecret and accessToken left blank (user fills in)
    const header = "name,appId,appSecret,accessToken,wabaId,phoneNumberId,displayPhone,verifiedName,status,qualityRating,webhookRegistered\r\n";
    const rows = phones.map((p) =>
      [
        p.waCredential?.name ?? "",
        p.waCredential?.appId ?? "",
        "",   // appSecret — cannot export (encrypted); user must fill in
        "",   // accessToken — cannot export (encrypted); user must fill in
        p.waCredential?.wabaId ?? "",
        p.phoneNumberId,
        p.displayPhone,
        p.verifiedName ?? "",
        p.status ?? "",
        p.qualityRating ?? "",
        p.waCredential?.webhookRegistered ? "Yes" : "No",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = header + rows.join("\r\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="phone-numbers-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (err) { next(err); }
});

// DELETE /api/accounts/phone-numbers/:phoneId
accountsRouter.delete("/phone-numbers/:phoneId", async (req, res, next) => {
  try {
    const phone = await prisma.phoneNumber.findFirst({
      where: { id: req.params.phoneId, businessId: req.user!.businessId },
    });
    if (!phone) return res.status(404).json({ success: false, error: "Phone number not found" });
    await prisma.phoneNumber.delete({ where: { id: req.params.phoneId } });
    return res.json({ success: true, message: "Phone number removed" });
  } catch (err) { next(err); }
});

// Helper for internal use
export async function getDecryptedAccessToken(credentialId: string): Promise<string | null> {
  const cred = await prisma.waCredential.findUnique({ where: { id: credentialId } });
  if (!cred) return null;
  return decrypt(cred.accessTokenEnc);
}
