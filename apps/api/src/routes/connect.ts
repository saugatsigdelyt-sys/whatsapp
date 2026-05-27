/**
 * POST /api/connect
 *
 * One-shot endpoint: authenticate with email + password, then import a
 * WhatsApp Cloud API credential and auto-register the webhook — all in a
 * single HTTP request, no browser session required.
 *
 * Body:
 *   email          string  — your WhatsAPI account email
 *   password       string  — your WhatsAPI account password
 *   appId          string  — Meta App ID
 *   appSecret      string  — Meta App Secret
 *   accessToken    string  — System User / permanent access token
 *   phoneNumberId  string  — WhatsApp Phone Number ID
 *   wabaId         string  — WhatsApp Business Account ID
 *   name           string? — friendly label (default: "My WhatsApp Account")
 *
 * Example with curl:
 *   curl -X POST https://api.whatsapi.buzz/api/connect \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *           "email": "you@example.com",
 *           "password": "yourpassword",
 *           "appId": "123456789",
 *           "appSecret": "abc123...",
 *           "accessToken": "EAABwzLixnjYBO...",
 *           "phoneNumberId": "987654321",
 *           "wabaId": "111222333",
 *           "name": "My Support Line"
 *         }'
 */

import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../lib/prisma";
import { encrypt, decrypt } from "../lib/encryption";
import { verifyAccessToken, getPhoneNumbers, registerWebhook } from "../lib/meta";
import { canAddWaAccount } from "../lib/subscription";

export const connectRouter = Router();

const connectSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  name: z.string().min(1).max(80).default("My WhatsApp Account"),
  appId: z.string().min(1),
  appSecret: z.string().min(1),
  accessToken: z.string().min(1),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
});

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

// POST /api/connect
connectRouter.post("/", async (req, res, next) => {
  try {
    // ── 1. Validate body ────────────────────────────────────────────────────
    let body: z.infer<typeof connectSchema>;
    try {
      body = connectSchema.parse(req.body);
    } catch (validationErr: any) {
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: validationErr?.errors ?? validationErr?.message,
      });
    }

    // ── 2. Authenticate user ────────────────────────────────────────────────
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    const passwordValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    // ── 3. Resolve business ─────────────────────────────────────────────────
    const member = await prisma.businessMember.findFirst({
      where: { userId: user.id },
      include: { business: true },
      orderBy: { createdAt: "asc" },
    });
    if (!member) {
      return res.status(403).json({ success: false, error: "Account has no associated business" });
    }
    const businessId = member.businessId;

    // Only OWNER / ADMIN may connect accounts via API
    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        error: "Only business Owners or Admins can connect WhatsApp accounts",
      });
    }

    // ── 4. Check subscription limit ─────────────────────────────────────────
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

    // ── 5. Verify access token with Meta ────────────────────────────────────
    const verification = await verifyAccessToken(body.accessToken);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: `Meta token verification failed: ${verification.error}`,
      });
    }

    // ── 6. Save / upsert credential ─────────────────────────────────────────
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

    // ── 7. Grant owner access ───────────────────────────────────────────────
    const ownerMember = await prisma.businessMember.findFirst({
      where: { businessId, role: "OWNER" },
    });
    if (ownerMember) {
      await prisma.waAccountAccess.upsert({
        where: {
          businessMemberId_waCredentialId: {
            businessMemberId: ownerMember.id,
            waCredentialId: credential.id,
          },
        },
        update: {},
        create: { businessMemberId: ownerMember.id, waCredentialId: credential.id },
      });
    }

    // ── 8. Sync phone numbers from Meta ─────────────────────────────────────
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
            waCredentialId: credential.id,
            healthError: null,
          },
          create: {
            businessId,
            phoneNumberId: phone.id,
            displayPhone: phone.display_phone_number,
            verifiedName: phone.verified_name,
            qualityRating: phone.quality_rating,
            status: phone.status,
            waCredentialId: credential.id,
          },
        });
      }
    }

    // ── 9. Register webhook ─────────────────────────────────────────────────
    let webhookStatus: { success: boolean; error?: string } = { success: false, error: "Not attempted" };
    try {
      webhookStatus = await autoRegisterWebhook(credential, businessId);
    } catch (webhookErr: any) {
      console.error("[connect] Webhook registration failed:", webhookErr?.message);
      webhookStatus = { success: false, error: webhookErr?.message ?? "Webhook registration failed" };
    }

    // ── 10. Respond ─────────────────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: webhookStatus.success
        ? "WhatsApp account connected and webhook registered successfully"
        : `Account connected. Webhook registration failed: ${webhookStatus.error}`,
      webhookRegistered: webhookStatus.success,
      webhookError: webhookStatus.success ? null : (webhookStatus.error ?? null),
      account: {
        id: credential.id,
        name: credential.name,
        appId: credential.appId,
        wabaId: credential.wabaId,
        phoneNumberId: body.phoneNumberId,
        business: member.business.name,
      },
      phoneNumbers: phones.phoneNumbers?.map((p) => ({
        id: p.id,
        displayPhone: p.display_phone_number,
        verifiedName: p.verified_name,
        status: p.status,
        qualityRating: p.quality_rating,
      })) ?? [],
    });
  } catch (err) {
    next(err);
  }
});
