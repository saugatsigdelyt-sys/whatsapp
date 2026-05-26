"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import api from "@/lib/api";
import { useT } from "@/lib/i18n";
import {
  RefreshCw, Download, Trash2, AlertTriangle,
  CheckCircle2, XCircle, AlertCircle, Lock,
  HelpCircle, Plus, Eye, EyeOff, X, Pencil,
  ChevronUp,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WaAccount {
  id: string;
  name: string;
  appId: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhone: string | null;
  webhookRegistered: boolean;
  webhookError: string | null;
  lastVerifiedAt: string | null;
  teamAccessCount: number;
  appSecret: string;
  accessToken: string;
}

interface PhoneNumber {
  id: string;
  phoneNumberId: string;
  displayPhone: string;
  verifiedName: string | null;
  qualityRating: string | null;
  status: string | null;
  healthError: string | null;
  waCredentialId: string | null;
  waCredential: {
    id: string;
    name: string;
    webhookRegistered: boolean;
    webhookError: string | null;
    appId: string;
    wabaId: string;
  } | null;
}

// ── Health logic ──────────────────────────────────────────────────────────────
type HealthStatus = "HEALTHY" | "WARNING" | "ISSUE" | "LOCKED" | "ERROR" | "UNKNOWN";

function computeHealth(phone: PhoneNumber): HealthStatus {
  if (phone.healthError) return "ERROR";
  const s = phone.status?.toUpperCase();
  if (s === "BANNED") return "LOCKED";
  if (s === "FLAGGED" || s === "RESTRICTED") return "ISSUE";
  const q = phone.qualityRating?.toUpperCase();
  if (s === "CONNECTED") {
    if (q === "GREEN") return "HEALTHY";
    if (q === "YELLOW") return "WARNING";
    if (q === "RED") return "ISSUE";
    return "HEALTHY";
  }
  if (!s) return "UNKNOWN";
  return "UNKNOWN";
}

// ── Health badge ──────────────────────────────────────────────────────────────
const HEALTH_CONFIG: Record<HealthStatus, { icon: React.ElementType; bg: string; text: string; border: string }> = {
  HEALTHY: { icon: CheckCircle2, bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  WARNING: { icon: AlertTriangle, bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  ISSUE:   { icon: AlertCircle,   bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"   },
  LOCKED:  { icon: Lock,          bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200"},
  ERROR:   { icon: XCircle,       bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"   },
  UNKNOWN: { icon: HelpCircle,    bg: "bg-gray-50",   text: "text-gray-500",   border: "border-gray-200"  },
};

function HealthBadge({ status, labelKey }: { status: HealthStatus; labelKey: string }) {
  const cfg = HEALTH_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={10} />
      {labelKey}
    </span>
  );
}

// ── Import form ───────────────────────────────────────────────────────────────
const EMPTY_FORM = { name: "", appId: "", appSecret: "", accessToken: "", wabaId: "", phoneNumberId: "" };

function ImportForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const t = useT();
  const [form, setForm] = useState(EMPTY_FORM);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/accounts/import", form);
      mutate("/api/accounts");
      mutate("/api/accounts/phone-numbers/all");
      mutate("/api/subscription");
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl border p-5 mt-4"
      style={{ background: "var(--color-paper)", borderColor: "var(--color-rule)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm" style={{ color: "var(--color-ink)" }}>
            {t("importCredentialsTitle")}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            {t("importCredentialsSubtitle")}
          </p>
        </div>
        <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
          <X size={15} />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg text-xs bg-red-50 text-red-700 border border-red-200">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>
            {t("fieldAccountLabel")}
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder={t("placeholderCustomerSupport")}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--color-rule)", "--tw-ring-color": "var(--color-accent)" } as any}
          />
        </div>
        {[
          { name: "appId",        labelKey: "fieldAppId",          ph: "placeholderMetaAppId" },
          { name: "wabaId",       labelKey: "fieldWabaId",         ph: "placeholderWabaId" },
          { name: "phoneNumberId", labelKey: "fieldPhoneNumberId", ph: "placeholderPhoneNumberId" },
        ].map((f) => (
          <div key={f.name}>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>
              {t(f.labelKey)}
            </label>
            <input
              name={f.name}
              value={form[f.name as keyof typeof form]}
              onChange={handleChange}
              placeholder={t(f.ph)}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--color-rule)" }}
            />
          </div>
        ))}
        {[
          { name: "appSecret",    labelKey: "fieldAppSecret" },
          { name: "accessToken",  labelKey: "fieldAccessToken" },
        ].map((f) => (
          <div key={f.name}>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>
              {t(f.labelKey)}
            </label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                name={f.name}
                value={form[f.name as keyof typeof form]}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 pr-9 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2"
                style={{ borderColor: "var(--color-rule)" }}
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn-accent py-2 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {loading ? t("verifyingImporting") : t("importCredentials")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium btn-ghost"
          >
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Account card ──────────────────────────────────────────────────────────────
function AccountCard({ account, onRetryWebhook, onRename, onDelete }: {
  account: WaAccount;
  onRetryWebhook: (id: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const t = useT();
  const [retrying, setRetrying] = useState(false);
  const [renamingId, setRenamingId] = useState(false);
  const [renameValue, setRenameValue] = useState(account.name);

  async function doRetry() {
    setRetrying(true);
    try { await onRetryWebhook(account.id); } finally { setRetrying(false); }
  }

  async function doRename() {
    if (!renameValue.trim()) return;
    await onRename(account.id, renameValue.trim());
    setRenamingId(false);
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: "white",
        borderColor: account.webhookRegistered ? "var(--color-rule)" : "oklch(80% 0.12 29)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: "var(--color-paper-2)" }}
        >
          <svg viewBox="0 0 24 24" fill="var(--color-accent)" className="w-4 h-4">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          {renamingId ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") doRename(); if (e.key === "Escape") setRenamingId(false); }}
                className="border rounded-lg px-2 py-1 text-sm w-44 focus:outline-none focus:ring-2"
                style={{ borderColor: "var(--color-rule)" }}
                autoFocus
              />
              <button onClick={doRename} className="text-xs font-medium px-2 py-1 rounded-lg btn-accent">{t("save")}</button>
              <button onClick={() => setRenamingId(false)} className="text-xs text-gray-500 hover:text-gray-700">{t("cancel")}</button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-semibold text-sm truncate" style={{ color: "var(--color-ink)" }}>
                {account.name}
              </span>
              <button onClick={() => { setRenamingId(true); setRenameValue(account.name); }} className="p-0.5 text-gray-400 hover:text-gray-600 shrink-0">
                <Pencil size={11} />
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-xs font-mono" style={{ color: "var(--color-muted)" }}>App: {account.appId}</span>
            <span className="text-xs font-mono" style={{ color: "var(--color-muted)" }}>WABA: {account.wabaId}</span>
          </div>
          {account.webhookError && (
            <div className="flex items-start gap-1 mt-2 p-2 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle size={11} className="text-red-500 shrink-0 mt-0.5" />
              <span className="text-xs text-red-700 break-all">
                <span className="font-semibold">{t("webhookErrorLabel")}</span> {account.webhookError}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {account.webhookRegistered ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
              <CheckCircle2 size={12} /> {t("webhookOk")}
            </span>
          ) : (
            <button
              onClick={doRetry}
              disabled={retrying}
              className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border transition-colors hover:bg-red-50 disabled:opacity-50"
              style={{ borderColor: "oklch(80% 0.12 29)", color: "oklch(45% 0.18 29)" }}
            >
              <RefreshCw size={11} className={retrying ? "animate-spin" : ""} />
              {retrying ? t("retryingWebhook") : t("retryWebhook")}
            </button>
          )}
          <button
            onClick={() => onDelete(account.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PhoneNumbersPage() {
  const t = useT();

  const { data: accountsData, isLoading: loadingAccounts } = useSWR(
    "/api/accounts",
    (url) => api.get(url).then((r) => r.data),
    { refreshInterval: 900_000 }
  );

  const { data: phonesData, isLoading: loadingPhones, mutate: mutatePhones } = useSWR(
    "/api/accounts/phone-numbers/all",
    (url) => api.get(url).then((r) => r.data.data),
    { refreshInterval: 900_000 }
  );

  const { data: subData } = useSWR("/api/subscription", (url) => api.get(url).then((r) => r.data.data));

  const accounts: WaAccount[] = accountsData?.data ?? [];
  const phones: PhoneNumber[] = phonesData ?? [];

  const [showImport, setShowImport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingPhoneId, setDeletingPhoneId] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const atLimit = subData ? !subData.canAddWaAccount : false;

  const allSelected = phones.length > 0 && selectedIds.size === phones.length;
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(phones.map((p) => p.id)));
  }
  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleRefresh() {
    setRefreshing(true);
    try {
      await api.post("/api/accounts/phone-numbers/refresh");
      mutatePhones();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleExport() {
    const resp = await api.get("/api/accounts/phone-numbers/export", { responseType: "blob" });
    const url = URL.createObjectURL(resp.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `phone-numbers-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeletePhone(id: string) {
    if (!confirm(t("confirmDeletePhone"))) return;
    setDeletingPhoneId(id);
    try {
      await api.delete(`/api/accounts/phone-numbers/${id}`);
      mutatePhones();
    } finally { setDeletingPhoneId(null); }
  }

  async function handleRetryWebhook(credentialId: string) {
    await api.post(`/api/accounts/${credentialId}/register-webhook`);
    mutate("/api/accounts");
  }

  async function handleRename(id: string, name: string) {
    await api.patch(`/api/accounts/${id}`, { name });
    mutate("/api/accounts");
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm(t("confirmRemoveAccount"))) return;
    try {
      await api.delete(`/api/accounts/${id}`);
      mutate("/api/accounts");
      mutate("/api/accounts/phone-numbers/all");
      mutate("/api/subscription");
    } catch { alert(t("failedToRemoveAccount")); }
  }

  async function handleBulkExport() {
    const selected = phones.filter((p) => selectedIds.has(p.id));
    const header = "Phone Number,Verified Name,Quality Rating,Status,Account,Webhook Registered\r\n";
    const rows = selected.map((p) =>
      [
        p.displayPhone, p.verifiedName ?? "", p.qualityRating ?? "",
        p.status ?? "", p.waCredential?.name ?? "",
        p.waCredential?.webhookRegistered ? "Yes" : "No",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const blob = new Blob([header + rows.join("\r\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `phones-selected-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} phone number(s)?`)) return;
    setBulkLoading(true);
    try {
      await Promise.all([...selectedIds].map((id) => api.delete(`/api/accounts/phone-numbers/${id}`)));
      setSelectedIds(new Set());
      mutatePhones();
    } finally { setBulkLoading(false); }
  }

  async function handleBulkRetryWebhook() {
    const selected = phones.filter((p) => selectedIds.has(p.id));
    const credIds = [...new Set(selected.map((p) => p.waCredentialId).filter(Boolean) as string[])];
    setBulkLoading(true);
    try {
      await Promise.all(credIds.map((id) => api.post(`/api/accounts/${id}/register-webhook`).catch(() => {})));
      mutate("/api/accounts");
    } finally { setBulkLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-ink)" }}>
            {t("phoneNumbersTitle")}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
            {t("phoneNumbersSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--color-neutral)" }}>
            {t("autoRefreshNote")}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium btn-ghost transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {t("refreshNow")}
          </button>
          {phones.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium btn-ghost transition-colors"
            >
              <Download size={13} />
              {t("exportCSV")}
            </button>
          )}
        </div>
      </div>

      {/* ── Import success toast ──────────────────────────────────────────── */}
      {importSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-green-50 text-green-800 border border-green-200">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{importSuccess}</span>
          <button onClick={() => setImportSuccess(null)} className="ml-auto opacity-60 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Connected accounts section ────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
              {t("connectedAccounts")}
            </h2>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              {t("connectedAccountsSubtitle")}
            </p>
          </div>
          {!atLimit && !showImport && (
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium btn-accent"
            >
              <Plus size={13} />
              {t("importNewAccount")}
            </button>
          )}
          {atLimit && (
            <a
              href="/dashboard/billing"
              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ background: "oklch(97% 0.04 60)", color: "oklch(45% 0.15 60)", border: "1px solid oklch(85% 0.06 60)" }}
            >
              <ChevronUp size={12} /> {t("upgradeBtn")}
            </a>
          )}
        </div>

        {loadingAccounts ? (
          <div className="text-sm py-4" style={{ color: "var(--color-muted)" }}>{t("loadingAccounts")}</div>
        ) : accounts.length === 0 ? (
          <div
            className="rounded-xl border p-6 text-center"
            style={{ borderColor: "var(--color-rule)", background: "var(--color-paper-2)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>{t("noAccountsYet")}</p>
            {!showImport && !atLimit && (
              <button
                onClick={() => setShowImport(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium btn-accent"
              >
                <Plus size={13} /> {t("importNewAccount")}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                onRetryWebhook={handleRetryWebhook}
                onRename={handleRename}
                onDelete={handleDeleteAccount}
              />
            ))}
          </div>
        )}

        {showImport && (
          <ImportForm
            onSuccess={() => {
              setShowImport(false);
              setImportSuccess("Account imported successfully. Webhook registration attempted.");
            }}
            onCancel={() => setShowImport(false)}
          />
        )}
      </div>

      {/* ── Phone numbers table ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
            {t("phoneNumbersTitle")}
            {phones.length > 0 && (
              <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-muted)" }}>
                ({phones.length})
              </span>
            )}
          </h2>
        </div>

        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--color-rule)", background: "white" }}
        >
          {loadingPhones ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>
              {t("loadingPhoneNumbers")}
            </div>
          ) : phones.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>
              {t("noPhoneNumbers")}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: "var(--color-paper-2)", borderBottom: "1px solid var(--color-rule)" }}>
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded cursor-pointer"
                      style={{ accentColor: "var(--color-accent)" }}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
                    {t("colPhone")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
                    {t("colVerifiedName")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
                    {t("colHealth")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
                    {t("colAccount")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
                    {t("colWebhook")}
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {phones.map((phone, idx) => {
                  const health = computeHealth(phone);
                  const healthLabelKey = {
                    HEALTHY: "healthHealthy", WARNING: "healthWarning", ISSUE: "healthIssue",
                    LOCKED: "healthLocked", ERROR: "healthError", UNKNOWN: "healthUnknown",
                  }[health];
                  const isSelected = selectedIds.has(phone.id);
                  return (
                    <tr
                      key={phone.id}
                      className="transition-colors cursor-pointer"
                      style={{
                        borderTop: idx > 0 ? "1px solid var(--color-rule)" : undefined,
                        background: isSelected ? "oklch(96% 0.018 143)" : "white",
                      }}
                      onClick={() => toggleOne(phone.id)}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--color-paper)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? "oklch(96% 0.018 143)" : "white"; }}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(phone.id)}
                          className="rounded cursor-pointer"
                          style={{ accentColor: "var(--color-accent)" }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm" style={{ color: "var(--color-ink)" }}>
                          {phone.displayPhone}
                        </div>
                        <div className="text-xs font-mono mt-0.5" style={{ color: "var(--color-muted)" }}>
                          {phone.phoneNumberId}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--color-neutral)" }}>
                        {phone.verifiedName ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <HealthBadge status={health} labelKey={t(healthLabelKey)} />
                        {phone.healthError && (
                          <div className="text-xs mt-1 text-red-600 max-w-[200px] break-all">
                            {phone.healthError}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--color-neutral)" }}>
                        {phone.waCredential?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {phone.waCredential ? (
                          phone.waCredential.webhookRegistered ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700">
                              <CheckCircle2 size={11} /> {t("webhookOk")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600">
                              <XCircle size={11} /> {t("webhookFailed")}
                            </span>
                          )
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeletePhone(phone.id)}
                          disabled={deletingPhoneId === phone.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          title={t("confirmDeletePhone")}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Bulk action bar ───────────────────────────────────────────────── */}
      {someSelected && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl border"
          style={{ background: "var(--color-ink)", borderColor: "oklch(35% 0.01 143)", minWidth: "320px" }}
        >
          <span className="text-sm font-medium text-white mr-2">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={handleBulkExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "oklch(30% 0.01 143)", color: "white" }}
            >
              <Download size={12} /> Export
            </button>
            <button
              onClick={handleBulkRetryWebhook}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: "oklch(30% 0.01 143)", color: "white" }}
            >
              <RefreshCw size={12} className={bulkLoading ? "animate-spin" : ""} /> Retry Webhook
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: "oklch(40% 0.20 29)", color: "white" }}
            >
              <Trash2 size={12} /> Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 rounded-lg text-white/60 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
