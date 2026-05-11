"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import api from "@/lib/api";
import { CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

function fetcher(url: string) {
  return api.get(url).then((r) => r.data.data);
}

export default function SettingsPage() {
  const { data: cred, isLoading } = useSWR("/api/accounts", fetcher);
  const [form, setForm] = useState({
    appId: "",
    appSecret: "",
    accessToken: "",
    wabaId: "",
    phoneNumberId: "",
  });
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/api/accounts/import", form);
      setResult({ success: true, message: data.message });
      mutate("/api/accounts");
    } catch (err: any) {
      setResult({ success: false, message: err.response?.data?.error ?? "Import failed" });
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { name: "appId", label: "App ID", placeholder: "Meta App ID (e.g. 123456789)" },
    { name: "appSecret", label: "App Secret", placeholder: "Your Meta App Secret", sensitive: true },
    { name: "accessToken", label: "System User Access Token", placeholder: "Long-lived system user admin token" },
    { name: "wabaId", label: "WhatsApp Business Account ID (WABA)", placeholder: "e.g. 102290129340" },
    { name: "phoneNumberId", label: "Phone Number ID", placeholder: "e.g. 106540352242922" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Import your WhatsApp Cloud API credentials</p>
      </div>

      {/* Current status */}
      {!isLoading && cred && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle size={17} className="text-green-600 mt-0.5 shrink-0" />
          <div className="text-sm text-green-800">
            <strong>Credentials connected</strong> — App ID: {cred.appId}, WABA: {cred.wabaId}
            {cred.webhookRegistered && <span className="ml-2 text-green-600">· Webhook registered ✓</span>}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-medium text-gray-900 mb-1">Import Cloud API Credentials</h2>
        <p className="text-sm text-gray-500 mb-5">
          You&apos;ll find these in the{" "}
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-brand-600 underline">
            Meta Developer Portal
          </a>. All secrets are encrypted before storing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {result && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${result.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              {result.success ? <CheckCircle size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
              {result.message}
            </div>
          )}

          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {field.label}
              </label>
              <div className="relative">
                <input
                  type={field.sensitive && !showSecret ? "password" : "text"}
                  name={field.name}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
                {field.sensitive && (
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {loading ? "Verifying & importing..." : "Import credentials"}
          </button>
        </form>
      </div>
    </div>
  );
}
