import axios from "axios";

const META_GRAPH_URL = "https://graph.facebook.com/v19.0";

/**
 * Registers all 11 webhook fields for a given Meta App.
 * Requires a System User access token with admin access.
 */
export async function registerWebhook(params: {
  appId: string;
  accessToken: string;
  callbackUrl: string;
  verifyToken: string;
}): Promise<{ success: boolean; error?: string }> {
  const fields = [
    "account_alerts",
    "account_review_update",
    "account_update",
    "business_capacity_update",
    "message_template_quality_update",
    "message_template_status_update",
    "messages",
    "phone_number_name_update",
    "phone_number_quality_update",
    "security",
    "template_category_update",
  ];

  try {
    await axios.post(
      `${META_GRAPH_URL}/${params.appId}/subscriptions`,
      null,
      {
        params: {
          object: "whatsapp_business_account",
          callback_url: params.callbackUrl,
          verify_token: params.verifyToken,
          fields: fields.join(","),
          access_token: params.accessToken,
        },
      }
    );
    return { success: true };
  } catch (err: unknown) {
    const message =
      axios.isAxiosError(err)
        ? err.response?.data?.error?.message ?? err.message
        : String(err);
    return { success: false, error: message };
  }
}

/**
 * Fetches the WABA phone numbers for a given business account.
 */
export async function getPhoneNumbers(params: {
  wabaId: string;
  accessToken: string;
}): Promise<{
  success: boolean;
  phoneNumbers?: Array<{
    id: string;
    display_phone_number: string;
    verified_name: string;
    quality_rating: string;
    status: string;
  }>;
  error?: string;
}> {
  try {
    const { data } = await axios.get(
      `${META_GRAPH_URL}/${params.wabaId}/phone_numbers`,
      {
        params: {
          fields: "id,display_phone_number,verified_name,quality_rating,status",
          access_token: params.accessToken,
        },
      }
    );
    return { success: true, phoneNumbers: data.data };
  } catch (err: unknown) {
    const message =
      axios.isAxiosError(err)
        ? err.response?.data?.error?.message ?? err.message
        : String(err);
    return { success: false, error: message };
  }
}

/**
 * Verifies that an access token is valid by calling /me
 */
export async function verifyAccessToken(
  accessToken: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    const { data } = await axios.get(`${META_GRAPH_URL}/me`, {
      params: { access_token: accessToken },
    });
    return { valid: true, userId: data.id };
  } catch (err: unknown) {
    const message =
      axios.isAxiosError(err)
        ? err.response?.data?.error?.message ?? err.message
        : String(err);
    return { valid: false, error: message };
  }
}

/**
 * Sends a text message via WhatsApp Cloud API
 */
export async function sendTextMessage(params: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data } = await axios.post(
      `${META_GRAPH_URL}/${params.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "text",
        text: { preview_url: false, body: params.text },
      },
      {
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err: unknown) {
    const message =
      axios.isAxiosError(err)
        ? err.response?.data?.error?.message ?? err.message
        : String(err);
    return { success: false, error: message };
  }
}
