"use client";

import { useState, useRef } from "react";
import useSWR, { mutate } from "swr";
import api from "@/lib/api";
import { useT } from "@/lib/i18n";
import {
  RefreshCw, Download, Upload, Trash2, AlertTriangle,
  CheckCircle2, XCircle, AlertCircle, Lock,
  HelpCircle, Plus, Eye, EyeOff, X,
  ChevronUp, FileText,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
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
  HEALTHY: { icon: CheckCircle2, bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200"  },
  WARNING: { icon: AlertTriangle,bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  ISSUE:   { icon: AlertCircle,  bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"    },
  LOCKED:  { icon: Lock,         bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  ERROR:   { icon: XCircle,      bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"    },
  UNKNOWN: { icon: HelpCircle,   bg: "bg-gray-50",   text: "text-gray-500",   border: "border-gray-200"   },
};

function HealthBadge({ status, label }: { status: HealthStatus; label: string }) {
  const cfg = HEALTH_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={10} />
      {label}
    </span>
  );
}

// ── Manual import form ────────────────────────────────────────────────────────
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
    <div className="rounded-xl border p-5" style={{ background: "var(--color-paper)", borderColor: "var(--color-rule)" }}>
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
            style={{ borderColor: "var(--color-rule)", ["--tw-ring-color" as any]: "var(--color-accent)" }}
          />
        </div>
        {[
          { name: "appId",         labelKey: "fieldAppId",          ph: "placeholderMetaAppId" },
          { name: "wabaId",        labelKey: "fieldWabaId",         ph: "placeholderWabaId" },
          { name: "phoneNumberId", labelKey: "fieldPhoneNumberId",  ph: "placeholderPhoneNumberId" },
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
          { name: "appSecret",   labelKey: "fieldAppSecret"   },
          { name: "accessToken", labelKey: "fieldAccessToken" },
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
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium btn-ghost">
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── CSV import modal ──────────────────────────────────────────────────────────
type CsvRowResult = {
  row: number;
  phoneNumberId: string;
  name: string;
  status: "pending" | "success" | "error";
  message?: string;
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    // Simple CSV parser that handles quoted fields
    const values: string[] = [];
    let inQuote = false;
    let current = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        values.push(current); current = "";
      } else {
        current += ch;
      }
    }
    values.push(current);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").trim(); });
    return row;
  });
}

function CSVImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRowResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) { setParseError("No data rows found in CSV."); return; }
        const required = ["appId", "appSecret", "accessToken", "wabaId", "phoneNumberId"];
        const missing = required.filter((k) => !(k in parsed[0]));
        if (missing.length > 0) {
          setParseError(`CSV missing required columns: ${missing.join(", ")}\n\nExpected: name, appId, appSecret, accessToken, wabaId, phoneNumberId`);
          return;
        }
        setParseError(null);
        setRows(parsed.map((r, i) => ({
          row: i + 2,
          phoneNumberId: r.phoneNumberId ?? "",
          name: r.name || `Imported #${i + 1}`,
          status: "pending",
        })));
        setDone(false);
        // Store parsed data for import
        (window as any).__csvRows = parsed;
      } catch {
        setParseError("Failed to parse CSV file.");
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    const parsed: Record<string, string>[] = (window as any).__csvRows ?? [];
    if (parsed.length === 0) return;
    setRunning(true);
    const updated = [...rows];

    for (let i = 0; i < parsed.length; i++) {
      const r = parsed[i];
      updated[i] = { ...updated[i], status: "pending" };
      setRows([...updated]);

      if (!r.appSecret || !r.accessToken) {
        updated[i] = { ...updated[i], status: "error", message: "appSecret and accessToken are required (blank in this CSV)" };
        setRows([...updated]);
        continue;
      }

      try {
        await api.post("/api/accounts/import", {
          name: r.name || `Imported #${i + 1}`,
          appId: r.appId,
          appSecret: r.appSecret,
          accessToken: r.accessToken,
          wabaId: r.wabaId,
          phoneNumberId: r.phoneNumberId,
        });
        updated[i] = { ...updated[i], status: "success", message: "Imported" };
      } catch (err: any) {
        updated[i] = { ...updated[i], status: "error", message: err.response?.data?.error ?? "Import failed" };
      }
      setRows([...updated]);
    }

    setRunning(false);
    setDone(true);
    mutate("/api/accounts");
    mutate("/api/accounts/phone-numbers/all");
    mutate("/api/subscription");
  }

  const successCount = rows.filter((r) => r.status === "success").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[80vh]"
        style={{ background: "var(--color-paper)", borderColor: "var(--color-rule)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-rule)" }}>
          <div className="flex items-center gap-2">
            <FileText size={16} style={{ color: "var(--color-accent)" }} />
            <span className="font-semibold text-sm" style={{ color: "var(--color-ink)" }}>Import from CSV</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Instructions */}
          <div
            className="rounded-lg p-3 text-xs"
            style={{ background: "var(--color-paper-2)", color: "var(--color-muted)", borderColor: "var(--color-rule)" }}
          >
            <p className="font-semibold mb-1" style={{ color: "var(--color-ink)" }}>Expected columns:</p>
            <p className="font-mono">name, appId, <span className="font-bold" style={{ color: "var(--color-accent)" }}>appSecret</span>, <span className="font-bold" style={{ color: "var(--color-accent)" }}>accessToken</span>, wabaId, phoneNumberId</p>
            <p className="mt-1.5">appSecret and accessToken are required and must be filled in — they are left blank in exports for security.</p>
          </div>

          {/* File picker */}
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium w-full justify-center transition-colors hover:bg-gray-50"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            >
              <Upload size={14} />
              {rows.length > 0 ? `${rows.length} rows loaded — click to change file` : "Choose CSV file"}
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>

          {parseError && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-xs bg-red-50 text-red-700 border border-red-200">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <pre className="whitespace-pre-wrap font-sans">{parseError}</pre>
            </div>
          )}

          {/* Row preview / results */}
          {rows.length > 0 && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--color-rule)" }}
            >
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ background: "var(--color-paper-2)", color: "var(--color-muted)" }}>
                {done
                  ? `Done — ${successCount} imported, ${errorCount} failed`
                  : `${rows.length} rows to import`}
              </div>
              <div className="divide-y max-h-52 overflow-y-auto" style={{ borderColor: "var(--color-rule)" }}>
                {rows.map((r) => (
                  <div key={r.row} className="flex items-center gap-3 px-3 py-2 text-xs">
                    <span className="font-mono text-gray-400 w-6 shrink-0">#{r.row}</span>
                    <span className="flex-1 truncate font-medium" style={{ color: "var(--color-ink)" }}>
                      {r.name}
                    </span>
                    <span className="font-mono text-gray-400 truncate max-w-[120px]">{r.phoneNumberId}</span>
                    <span className="shrink-0 ml-2">
                      {r.status === "pending" && running && (
                        <RefreshCw size={11} className="animate-spin text-blue-500" />
                      )}
                      {r.status === "pending" && !running && (
                        <span className="text-gray-300">—</span>
                      )}
                      {r.status === "success" && (
                        <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                          <CheckCircle2 size={11} /> OK
                        </span>
                      )}
                      {r.status === "error" && (
                        <span
                          className="inline-flex items-center gap-1 text-red-600 font-semibold cursor-default"
                          title={r.message}
                        >
                          <XCircle size={11} /> Fail
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-2" style={{ borderColor: "var(--color-rule)" }}>
          {done ? (
            <button onClick={onDone} className="flex-1 btn-accent py-2 rounded-lg text-sm font-medium">
              Done
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={rows.length === 0 || running}
              className="flex-1 btn-accent py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {running ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw size={13} className="animate-spin" /> Importing…
                </span>
              ) : (
                `Import ${rows.length > 0 ? rows.length + " rows" : ""}`
              )}
            </button>
          )}
          <button
            onClick={onClose}
            disabled={running}
            className="px-4 py-2 rounded-lg text-sm font-medium btn-ghost disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PhoneNumbersPage() {
  const t = useT();

  const { data: phonesData, isLoading: loadingPhones, mutate: mutatePhones } = useSWR(
    "/api/accounts/phone-numbers/all",
    (url) => api.get(url).then((r) => r.data.data),
    { refreshInterval: 900_000 }
  );

  const { data: subData } = useSWR("/api/subscription", (url) => api.get(url).then((r) => r.data.data));

  const phones: PhoneNumber[] = phonesData ?? [];

  const [showImport,     setShowImport]     = useState(false);
  const [showCSVImport,  setShowCSVImport]  = useState(false);
  const [refreshing,     setRefreshing]     = useState(false);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [importSuccess,  setImportSuccess]  = useState<string | null>(null);
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [bulkLoading,    setBulkLoading]    = useState(false);

  const atLimit    = subData ? !subData.canAddWaAccount : false;
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleRefresh() {
    setRefreshing(true);
    try {
      await api.post("/api/accounts/phone-numbers/refresh");
      mutatePhones();
    } finally { setRefreshing(false); }
  }

  async function handleExport() {
    const resp = await api.get("/api/accounts/phone-numbers/export", { responseType: "blob" });
    const url  = URL.createObjectURL(resp.data);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `phone-numbers-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeletePhone(id: string) {
    if (!confirm(t("confirmDeletePhone"))) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/accounts/phone-numbers/${id}`);
      mutatePhones();
    } finally { setDeletingId(null); }
  }

  async function handleBulkExport() {
    // Re-importable format — appSecret / accessToken left blank
    const selected = phones.filter((p) => selectedIds.has(p.id));
    const header = "name,appId,appSecret,accessToken,wabaId,phoneNumberId,displayPhone,verifiedName,status,qualityRating,webhookRegistered\r\n";
    const rows = selected.map((p) =>
      [
        p.waCredential?.name ?? "",
        p.waCredential?.appId ?? "",
        "",  // appSecret — fill in before re-importing
        "",  // accessToken — fill in before re-importing
        p.waCredential?.wabaId ?? "",
        p.phoneNumberId,
        p.displayPhone,
        p.verifiedName ?? "",
        p.status ?? "",
        p.qualityRating ?? "",
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
    const credIds  = [...new Set(selected.map((p) => p.waCredentialId).filter(Boolean) as string[])];
    setBulkLoading(true);
    try {
      await Promise.all(credIds.map((id) => api.post(`/api/accounts/${id}/register-webhook`).catch(() => {})));
      mutate("/api/accounts");
    } finally { setBulkLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-ink)" }}>
            {t("phoneNumbersTitle")}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
            {t("phoneNumbersSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
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
          <button
            onClick={() => { setShowCSVImport(true); setShowImport(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium btn-ghost transition-colors"
          >
            <Upload size={13} />
            Import CSV
          </button>
          {atLimit ? (
            <a
              href="/dashboard/billing"
              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ background: "oklch(97% 0.04 60)", color: "oklch(45% 0.15 60)", border: "1px solid oklch(85% 0.06 60)" }}
            >
              <ChevronUp size={12} /> {t("upgradeBtn")}
            </a>
          ) : (
            <button
              onClick={() => { setShowImport((v) => !v); setShowCSVImport(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium btn-accent"
            >
              <Plus size={13} />
              {t("importNewAccount")}
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

      {/* ── Manual import form (inline, collapsible) ──────────────────────── */}
      {showImport && (
        <ImportForm
          onSuccess={() => {
            setShowImport(false);
            setImportSuccess("Account imported successfully. Webhook registration attempted.");
          }}
          onCancel={() => setShowImport(false)}
        />
      )}

      {/* ── Phone numbers table ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
            Phone Numbers
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
            <div className="p-10 text-center">
              <p className="text-sm mb-3" style={{ color: "var(--color-muted)" }}>{t("noPhoneNumbers")}</p>
              {!atLimit && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => { setShowImport(true); setShowCSVImport(false); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium btn-accent"
                  >
                    <Plus size={13} /> {t("importNewAccount")}
                  </button>
                  <button
                    onClick={() => { setShowCSVImport(true); setShowImport(false); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium btn-ghost"
                  >
                    <Upload size={13} /> Import CSV
                  </button>
                </div>
              )}
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
                    Account / App ID
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
                  const healthLabel = {
                    HEALTHY: t("healthHealthy"),
                    WARNING: t("healthWarning"),
                    ISSUE:   t("healthIssue"),
                    LOCKED:  t("healthLocked"),
                    ERROR:   t("healthError"),
                    UNKNOWN: t("healthUnknown"),
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
                        <HealthBadge status={health} label={healthLabel} />
                        {phone.healthError && (
                          <div className="text-xs mt-1 text-red-600 max-w-[200px] break-all">
                            {phone.healthError}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {phone.waCredential ? (
                          <>
                            <div className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                              {phone.waCredential.name}
                            </div>
                            <div className="text-xs font-mono mt-0.5" style={{ color: "var(--color-muted)" }}>
                              App: {phone.waCredential.appId}
                            </div>
                            {phone.waCredential.webhookError && (
                              <div className="text-xs mt-0.5 text-red-500 max-w-[180px] break-all" title={phone.waCredential.webhookError}>
                                ⚠ {phone.waCredential.webhookError.slice(0, 60)}{phone.waCredential.webhookError.length > 60 ? "…" : ""}
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "var(--color-muted)" }}>—</span>
                        )}
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
                          disabled={deletingId === phone.id}
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

      {/* ── CSV import modal ──────────────────────────────────────────────── */}
      {showCSVImport && (
        <CSVImportModal
          onClose={() => setShowCSVImport(false)}
          onDone={() => {
            setShowCSVImport(false);
            setImportSuccess("CSV import complete.");
          }}
        />
      )}
    </div>
  );
}
