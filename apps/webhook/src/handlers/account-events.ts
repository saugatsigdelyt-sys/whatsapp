import { prisma } from "@whatsapp-saas/database";
import type { WebhookField } from "@whatsapp-saas/types";

const fieldToEnum: Record<WebhookField, string> = {
  account_alerts: "ACCOUNT_ALERTS",
  account_review_update: "ACCOUNT_REVIEW_UPDATE",
  account_update: "ACCOUNT_UPDATE",
  business_capacity_update: "BUSINESS_CAPACITY_UPDATE",
  message_template_quality_update: "MESSAGE_TEMPLATE_QUALITY_UPDATE",
  message_template_status_update: "MESSAGE_TEMPLATE_STATUS_UPDATE",
  messages: "MESSAGES",
  phone_number_name_update: "PHONE_NUMBER_NAME_UPDATE",
  phone_number_quality_update: "PHONE_NUMBER_QUALITY_UPDATE",
  security: "SECURITY",
  template_category_update: "TEMPLATE_CATEGORY_UPDATE",
};

/**
 * Handles all non-message webhook fields by storing them as AccountEvents.
 * This covers all 10 non-message webhook fields.
 */
export async function handleAccountEvent(
  businessId: string,
  field: WebhookField,
  value: unknown
): Promise<void> {
  const enumValue = fieldToEnum[field];
  if (!enumValue) {
    console.warn(`[account-events] Unknown field: ${field}`);
    return;
  }

  await prisma.accountEvent.create({
    data: {
      businessId,
      field: enumValue as any,
      payload: value as object,
      processed: false,
    },
  });

  console.log(`📋 Saved account event [${field}] for business ${businessId}`);

  // Additional side effects per event type
  if (field === "phone_number_quality_update") {
    await syncPhoneQuality(businessId, value);
  }
}

/**
 * When phone quality changes, update the PhoneNumber record.
 */
async function syncPhoneQuality(businessId: string, value: unknown): Promise<void> {
  try {
    const data = value as {
      phone_number_id?: string;
      current_limit?: string;
      quality_rating?: string;
    };

    if (data.phone_number_id) {
      await prisma.phoneNumber.updateMany({
        where: { phoneNumberId: data.phone_number_id, businessId },
        data: {
          qualityRating: data.quality_rating ?? data.current_limit ?? undefined,
        },
      });
    }
  } catch (err) {
    console.error("[account-events] Failed to sync phone quality:", err);
  }
}
