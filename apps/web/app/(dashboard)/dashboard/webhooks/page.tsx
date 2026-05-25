"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import api from "@/lib/api";
import { useT } from "@/lib/i18n";
import { CheckCircle, AlertCircle, Webhook } from "lucide-react";

function fetcher(url: string) {
  return api.get(url).then((r) => r.data.data);
}

const WEBHOOK_FIELDS = [
  { key: "messages", label: "messages", description: "Inbound & outbound message events" },
  { key: "accountAlerts", label: "account_alerts", description: "Platform alerts for your account" },
  { key: "accountReviewUpdate", label: "account_review_update", description: "Account review status changes" },
  { key: "accountUpdate", label: "account_update", description: "General account updates" },
  { key: "businessCapacityUpdate", label: "business_capacity_update", description: "Messaging limit changes" },
  { key: "messageTemplateQualityUpdate", label: "message_template_quality_update", description: "Template quality score changes" },
  { key: "messageTemplateStatusUpdate", label: "message_template_status_update", description: "Template approval/rejection" },
  { key: "phoneNumberNameUpdate", label: "phone_number_name_update", description: "Display name changes" },
  { key: "phoneNumberQualityUpdate", label: "phone_number_quality_update", description: "Phone number quality rating" },
  { key: "security", label: "security", description: "Security-related notifications" },
  { key: "templateCategoryUpdate", label: "template_category_update", description: "Template category changes" },
];

export default function WebhooksPage() {
  const t = useT();
  const { data: sub } = useSWR("/api/webhooks", fetcher);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function registerWebhook() {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/api/webhooks/register");
      setResult({ success: true, message: data.message });
      mutate("/api/webhooks");
    } catch (err: any) {
      setResult({ success: false, message: err.response?.data?.error ?? "Registration failed" });
    } finally {
      setLoading(false);
    }
  }

  const isRegistered = Boolean(sub);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t("webhooksTitle")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("webhooksSubtitle")}</p>
      </div>

      <div className={`rounded-xl border p-4 flex items-start gap-3 ${isRegistered ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
        {isRegistered
          ? <CheckCircle size={17} className="text-green-600 mt-0.5 shrink-0" />
          : <Webhook size={17} className="text-amber-600 mt-0.5 shrink-0" />}
        <div className="text-sm">
          <strong className={isRegistered ? "text-green-800" : "text-amber-800"}>
            {isRegistered ? t("webhookRegistered") : t("webhookNotRegistered")}
          </strong>
          <p className={`mt-0.5 ${isRegistered ? "text-green-700" : "text-amber-700"}`}>
            {isRegistered ? t("webhookRegisteredMsg") : t("webhookNotRegisteredMsg")}
          </p>
        </div>
      </div>

      {result && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${result.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {result.success ? <CheckCircle size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
          {result.message}
        </div>
      )}

      <button onClick={registerWebhook} disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60">
        {loading ? t("registeringWebhook") : isRegistered ? t("reRegisterWebhook") : t("registerWebhookWithMeta")}
      </button>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-medium text-gray-700">{t("subscribedWebhookFields")}</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {WEBHOOK_FIELDS.map((field) => {
            const subscribed = sub ? Boolean((sub as any)[field.key]) : false;
            return (
              <div key={field.key} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <code className="text-xs font-mono text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">{field.label}</code>
                  <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${subscribed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {subscribed ? t("active") : t("inactive")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
