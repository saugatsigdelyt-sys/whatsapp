import axios from "axios";

const META_GRAPH_URL = "https://graph.facebook.com/v19.0";

async function getAppAccessToken(appId: string, appSecret: string): Promise<string> {
  const { data } = await axios.get(`https://graph.facebook.com/oauth/access_token`, {
    params: { client_id: appId, client_secret: appSecret, grant_type: "client_credentials" },
  });
  return data.access_token as string;
}

export async function registerWebhook(params: {
  appId: string; appSecret: string; wabaId: string; accessToken: string;
  callbackUrl: string; verifyToken: string;
}): Promise<{ success: boolean; error?: string }> {
  const fields = [
    "account_alerts","account_review_update","account_update","business_capability_update",
    "message_template_quality_update","message_template_status_update","messages",
    "phone_number_name_update","phone_number_quality_update","security","template_category_update",
  ];
  try {
    const appAccessToken = await getAppAccessToken(params.appId, params.appSecret);
    await axios.post(`${META_GRAPH_URL}/${params.appId}/subscriptions`, null, {
      params: {
        object: "whatsapp_business_account",
        callback_url: params.callbackUrl,
        verify_token: params.verifyToken,
        fields: fields.join(","),
        access_token: appAccessToken,
      },
    });
    try {
      await axios.post(`${META_GRAPH_URL}/${params.wabaId}/subscribed_apps`, null, {
        params: { access_token: params.accessToken },
      });
      console.log(`[webhook] WABA ${params.wabaId} subscribed to app successfully`);
    } catch (wabaErr: unknown) {
      const msg = axios.isAxiosError(wabaErr) ? wabaErr.response?.data?.error?.message ?? wabaErr.message : String(wabaErr);
      console.warn(`[webhook] WABA subscription skipped (non-fatal): ${msg}`);
    }
    return { success: true };
  } catch (err: unknown) {
    const message = axios.isAxiosError(err) ? err.response?.data?.error?.message ?? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function getPhoneNumbers(params: {
  wabaId: string; accessToken: string;
}): Promise<{
  success: boolean;
  phoneNumbers?: Array<{ id: string; display_phone_number: string; verified_name: string; quality_rating: string; status: string; throughput?: { level: string }; messaging_limit_tier?: string }>;
  error?: string;
}> {
  try {
    const { data } = await axios.get(`${META_GRAPH_URL}/${params.wabaId}/phone_numbers`, {
      params: { fields: "id,display_phone_number,verified_name,quality_rating,status,throughput,messaging_limit_tier", access_token: params.accessToken },
    });
    return { success: true, phoneNumbers: data.data };
  } catch (err: unknown) {
    const message = axios.isAxiosError(err) ? err.response?.data?.error?.message ?? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function verifyAccessToken(accessToken: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    const { data } = await axios.get(`${META_GRAPH_URL}/me`, { params: { access_token: accessToken } });
    return { valid: true, userId: data.id };
  } catch (err: unknown) {
    const message = axios.isAxiosError(err) ? err.response?.data?.error?.message ?? err.message : String(err);
    return { valid: false, error: message };
  }
}

export async function sendTextMessage(params: {
  phoneNumberId: string; accessToken: string; to: string; text: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data } = await axios.post(
      `${META_GRAPH_URL}/${params.phoneNumberId}/messages`,
      { messaging_product: "whatsapp", recipient_type: "individual", to: params.to, type: "text", text: { preview_url: false, body: params.text } },
      { headers: { Authorization: `Bearer ${params.accessToken}`, "Content-Type": "application/json" } }
    );
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err: unknown) {
    const message = axios.isAxiosError(err) ? err.response?.data?.error?.message ?? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function getWabaInfo(params: {
  wabaId: string; accessToken: string;
}): Promise<{ success: boolean; name?: string; country?: string; messagingTier?: string; error?: string }> {
  try {
    const { data: phoneData } = await axios.get(`${META_GRAPH_URL}/${params.wabaId}/phone_numbers`, {
      params: { fields: "id,display_phone_number,throughput,messaging_limit_tier", access_token: params.accessToken },
    });
    const phones = phoneData.data ?? [];
    let messagingTier = "UNKNOWN";
    if (phones.length > 0) {
      const limitTier = phones[0]?.messaging_limit_tier ?? "";
      const throughputLevel = phones[0]?.throughput?.level ?? "";
      if (limitTier) {
        messagingTier = limitTier;
      } else if (throughputLevel === "NOT_APPLICABLE") {
        messagingTier = "CUSTOMER_INITIATED_ONLY";
      } else if (throughputLevel === "STANDARD" || throughputLevel === "HIGH") {
        messagingTier = "TIER_1";
      }
    }
    const { data: wabaData } = await axios.get(`${META_GRAPH_URL}/${params.wabaId}`, {
      params: { fields: "name,country,currency,timezone_id", access_token: params.accessToken },
    });
    return { success: true, name: wabaData.name, country: wabaData.country, messagingTier };
  } catch (err: unknown) {
    const message = axios.isAxiosError(err) ? err.response?.data?.error?.message ?? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function getMessageTemplates(params: {
  wabaId: string; accessToken: string;
}): Promise<{ success: boolean; templates?: any[]; error?: string }> {
  try {
    const { data } = await axios.get(`${META_GRAPH_URL}/${params.wabaId}/message_templates`, {
      params: { fields: "id,name,language,status,category,components,rejected_reason", access_token: params.accessToken, limit: 200 },
    });
    return { success: true, templates: data.data ?? [] };
  } catch (err: unknown) {
    const message = axios.isAxiosError(err) ? err.response?.data?.error?.message ?? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function createMessageTemplate(params: {
  wabaId: string; accessToken: string;
  name: string; language: string; category: string; components: any[];
}): Promise<{ success: boolean; templateId?: string; status?: string; error?: string }> {
  try {
    const { data } = await axios.post(
      `${META_GRAPH_URL}/${params.wabaId}/message_templates`,
      { name: params.name, language: params.language, category: params.category, components: params.components },
      { headers: { Authorization: `Bearer ${params.accessToken}`, "Content-Type": "application/json" } }
    );
    return { success: true, templateId: String(data.id), status: data.status };
  } catch (err: unknown) {
    const message = axios.isAxiosError(err) ? err.response?.data?.error?.message ?? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function sendTemplateMessage(params: {
  phoneNumberId: string; accessToken: string; to: string;
  templateName: string; templateLanguage: string; components?: any[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data } = await axios.post(
      `${META_GRAPH_URL}/${params.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "template",
        template: {
          name: params.templateName,
          language: { code: params.templateLanguage },
          ...(params.components?.length ? { components: params.components } : {}),
        },
      },
      { headers: { Authorization: `Bearer ${params.accessToken}`, "Content-Type": "application/json" } }
    );
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err: unknown) {
    const message = axios.isAxiosError(err) ? err.response?.data?.error?.message ?? err.message : String(err);
    return { success: false, error: message };
  }
}
