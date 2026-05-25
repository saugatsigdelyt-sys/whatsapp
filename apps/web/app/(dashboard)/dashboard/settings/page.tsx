"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import api from "@/lib/api";
import { useT } from "@/lib/i18n";
import {
  CheckCircle, AlertCircle, Eye, EyeOff,
  Plus, Trash2, Pencil, X, ChevronUp,
} from "lucide-react";

function fetcher(url: string) {
  return api.get(url).then((r) => r.data);
}

interface WaAccount {
  id: string; name: string; appId: string; wabaId: string;
  phoneNumberId: string; webhookRegistered: boolean;
  lastVerifiedAt: string | null; teamAccessCount: number;
}
interface SubData {
  tier: string;
  limits: { maxWaAccounts: number; maxTeamMembers: number };
  usage: { waAccounts: number; teamMembers: number };
  canAddWaAccount: boolean;
}

const EMPTY_FORM = { name: "", appId: "", appSecret: "", accessToken: "", wabaId: "", phoneNumberId: "" };
const TIER_COLORS: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-600", STANDARD: "bg-blue-100 text-blue-700",
  PREMIUM: "bg-purple-100 text-purple-700", PLATINUM: "bg-yellow-100 text-yellow-700",
};

export default function SettingsPage() {
  const t = useT();
  const { data: accountsData, isLoading: loadingAccounts } = useSWR("/api/accounts", fetcher);
  const { data: subData } = useSWR("/api/subscription", fetcher);

  const accounts: WaAccount[] = accountsData?.data ?? [];
  const sub: SubData | null = subData?.data ?? null;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/api/accounts/import", form);
      setResult({ success: true, message: data.message });
      setForm(EMPTY_FORM);
      setShowForm(false);
      mutate("/api/accounts");
      mutate("/api/subscription");
    } catch (err: any) {
      setResult({ success: false, message: err.response?.data?.error ?? "Import failed" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmRemoveAccount"))) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/accounts/${id}`);
      mutate("/api/accounts");
      mutate("/api/subscription");
    } catch { alert(t("failedToRemoveAccount")); }
    finally { setDeletingId(null); }
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return;
    try {
      await api.patch(`/api/accounts/${id}`, { name: renameValue.trim() });
      mutate("/api/accounts");
      setRenamingId(null);
    } catch { alert(t("failedToRename")); }
  }

  const atLimit = sub ? !sub.canAddWaAccount : false;
  const usagePercent = sub
    ? Math.round((sub.usage.waAccounts / (sub.limits.maxWaAccounts === Infinity ? sub.usage.waAccounts + 1 : sub.limits.maxWaAccounts)) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t("settingsTitle")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("settingsSubtitle")}</p>
      </div>

      {sub && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_COLORS[sub.tier]}`}>{sub.tier}</span>
              <span className="text-sm text-gray-600">
                {t("accountsUsed", sub.usage.waAccounts, sub.limits.maxWaAccounts === Infinity ? "∞" : String(sub.limits.maxWaAccounts))}
              </span>
            </div>
            <a href="/pricing" className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
              <ChevronUp size={12} /> {t("upgradePlan")}
            </a>
          </div>
          {sub.limits.maxWaAccounts !== Infinity && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-yellow-500" : "bg-brand-500"}`} style={{ width: `${Math.min(usagePercent, 100)}%` }} />
            </div>
          )}
        </div>
      )}

      {result && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${result.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {result.success ? <CheckCircle size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
          <span>{result.message}</span>
          <button onClick={() => setResult(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      {loadingAccounts ? (
        <div className="text-sm text-gray-400">{t("loadingAccounts")}</div>
      ) : accounts.length > 0 ? (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
              <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="#16a34a" className="w-5 h-5"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                {renamingId === acc.id ? (
                  <div className="flex items-center gap-2">
                    <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleRename(acc.id); if (e.key === "Escape") setRenamingId(null); }} className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-brand-500" autoFocus />
                    <button onClick={() => handleRename(acc.id)} className="text-xs bg-brand-600 text-white px-2 py-1 rounded-lg">{t("save")}</button>
                    <button onClick={() => setRenamingId(null)} className="text-xs text-gray-500 hover:text-gray-700">{t("cancel")}</button>
                  </div>
                ) : (
                  <div className="font-medium text-gray-900 text-sm truncate">{acc.name}</div>
                )}
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-400 font-mono">App: {acc.appId}</span>
                  <span className="text-xs text-gray-400 font-mono">WABA: {acc.wabaId}</span>
                  {acc.webhookRegistered && <span className="text-xs text-green-600 font-medium">{t("webhookActive")}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => { setRenamingId(acc.id); setRenameValue(acc.name); }} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Rename"><Pencil size={13} /></button>
                <button onClick={() => handleDelete(acc.id)} disabled={deletingId === acc.id} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40" title="Remove"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>{t("noAccountsYet")}</strong>
        </div>
      )}

      {atLimit ? (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 flex items-center justify-between">
          <span><strong>{t("accountLimitReached")}</strong> {t("accountLimitMsg")}</span>
          <a href="/pricing" className="ml-4 shrink-0 bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-orange-600">{t("upgradeBtn")}</a>
        </div>
      ) : (
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2.5 rounded-xl transition-colors border border-brand-100">
          <Plus size={15} />
          {showForm ? t("cancel") : t("importNewAccount")}
        </button>
      )}

      {showForm && !atLimit && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">{t("importCredentialsTitle")}</h2>
          <p className="text-sm text-gray-500 mb-5">
            {t("importCredentialsSubtitle").split("Meta Developer Portal").length > 1 ? (
              <>
                {t("importCredentialsSubtitle").split("Meta Developer Portal")[0]}
                <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-brand-600 underline">Meta Developer Portal</a>
                {t("importCredentialsSubtitle").split("Meta Developer Portal")[1]}
              </>
            ) : t("importCredentialsSubtitle")}
          </p>
          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("fieldAccountLabel")}</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder={t("placeholderCustomerSupport")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            {[
              { name: "appId", labelKey: "fieldAppId", placeholderKey: "placeholderMetaAppId" },
              { name: "wabaId", labelKey: "fieldWabaId", placeholderKey: "placeholderWabaId" },
              { name: "phoneNumberId", labelKey: "fieldPhoneNumberId", placeholderKey: "placeholderPhoneNumberId" },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t(field.labelKey)}</label>
                <input name={field.name} value={form[field.name as keyof typeof form]} onChange={handleChange} placeholder={t(field.placeholderKey)} required className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            ))}
            {[
              { name: "appSecret", labelKey: "fieldAppSecret" },
              { name: "accessToken", labelKey: "fieldAccessToken" },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t(field.labelKey)}</label>
                <div className="relative">
                  <input type={showSecret ? "text" : "password"} name={field.name} value={form[field.name as keyof typeof form]} onChange={handleChange} required className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10" />
                  <button type="button" onClick={() => setShowSecret((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
              {loading ? t("verifyingImporting") : t("importCredentials")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
