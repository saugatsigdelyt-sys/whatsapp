import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { encrypt, decrypt } from "../lib/encryption";
import { verifyAccessToken, getPhoneNumbers } from "../lib/meta";
import { requireAuth, requireBusiness } from "../middleware/auth";

export const accountsRouter = Router();
accountsRouter.use(requireAuth);
accountsRouter.use(requireBusiness);

const importCredentialsSchema = z.object({
  appId: z.string().min(1),
  appSecret: z.string().min(1),
  accessToken: z.string().min(1),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
});

// GET /api/accounts — get current business WA credentials (masked)
accountsRouter.get("/", async (req, res, next) => {
  try {
    const credential = await prisma.waCredential.findUnique({
      where: { businessId: req.user!.businessId },
    });

    if (!credential) {
      return res.json({ success: true, data: null });
    }

    // Never return raw secrets — mask them
    return res.json({
      success: true,
      data: {
        id: credential.id,
        appId: credential.appId,
        wabaId: credential.wabaId,
        phoneNumberId: credential.phoneNumberId,
        webhookRegistered: credential.webhookRegistered,
        lastVerifiedAt: credential.lastVerifiedAt,
        // Mask sensitive fields
        appSecret: "••••••••",
        accessToken: "••••••••",
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/accounts/import — import WA Cloud API credentials
accountsRouter.post("/import", async (req, res, next) => {
  try {
    const body = importCredentialsSchema.parse(req.body);
    const businessId = req.user!.businessId!;

    // Verify token with Meta before saving
    const verification = await verifyAccessToken(body.accessToken);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: `Meta token verification failed: ${verification.error}`,
      });
    }

    // Encrypt sensitive fields
    const appSecretEnc = encrypt(body.appSecret);
    const accessTokenEnc = encrypt(body.accessToken);

    const credential = await prisma.waCredential.upsert({
      where: { businessId },
      update: {
        appId: body.appId,
        appSecretEnc,
        accessTokenEnc,
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
        lastVerifiedAt: new Date(),
        webhookRegistered: false, // reset on re-import
      },
      create: {
        businessId,
        appId: body.appId,
        appSecretEnc,
        accessTokenEnc,
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
        lastVerifiedAt: new Date(),
      },
    });

    // Also sync phone numbers from Meta
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
      message: "Credentials imported and verified successfully",
      data: {
        id: credential.id,
        appId: credential.appId,
        wabaId: credential.wabaId,
        webhookRegistered: credential.webhookRegistered,
        phoneNumbers: phones.phoneNumbers ?? [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/accounts — remove credentials
accountsRouter.delete("/", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    await prisma.waCredential.delete({ where: { businessId } });
    return res.json({ success: true, message: "Credentials removed" });
  } catch (err) {
    next(err);
  }
});

// GET /api/accounts/phone-numbers — list phone numbers
accountsRouter.get("/phone-numbers", async (req, res, next) => {
  try {
    const phones = await prisma.phoneNumber.findMany({
      where: { businessId: req.user!.businessId },
    });
    return res.json({ success: true, data: phones });
  } catch (err) {
    next(err);
  }
});

// Helper for internal use: get decrypted access token
export async function getDecryptedAccessToken(businessId: string): Promise<string | null> {
  const cred = await prisma.waCredential.findUnique({ where: { businessId } });
  if (!cred) return null;
  return decrypt(cred.accessTokenEnc);
}
