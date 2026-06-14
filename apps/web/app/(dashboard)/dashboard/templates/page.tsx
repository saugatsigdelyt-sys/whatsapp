"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import api from "@/lib/api";
import { useT } from "@/lib/i18n";
import {
  Plus, RefreshCw, Trash2, CheckCircle, Clock, XCircle, ChevronRight,
  ChevronLeft, Image, Type, AlignLeft, Link2, Phone, MessageSquare, Eye,
  Send, X,
} from "lucide-react";

function fetcher(url: string) { return api.get(url).then((r) => r.data); }

interface WaCred { id: string; name: string; displayPhone: string | null; }
interface Template {
  id: string; metaTemplateId: string; name: string; language: string;
  category: string; status: string; components: any[];
  waCredential: { name: string; displayPhone: string | null };
}
interface ComponentDef {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  buttons?: ButtonDef[];
}
interface ButtonDef {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phone_number?: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; Icon: any }> = {
  APPROVED:   { label: "Approved",   cls: "bg-green-100 text-green-700", Icon: CheckCircle },
  PENDING:    { label: "Pending",    cls: "bg-yellow-100 text-yellow-700", Icon: Clock },
  IN_APPEAL:  { label: "In Appeal",  cls: "bg-blue-100 text-blue-700", Icon: Clock },
  REJECTED:   { label: "Rejected",   cls: "bg-red-100 text-red-700", Icon: XCircle },
  PAUSED:     { label: "Paused",     cls: "bg-gray-100 text-gray-600", Icon: XCircle },
  DISABLED:   { label: "Disabled",   cls: "bg-red-100 text-red-600", Icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: "bg-gray-100 text-gray-600", Icon: Clock };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      <cfg.Icon size={11} />
      {cfg.label}
    </span>
  );
}

function PhonePreview({ components }: { components: ComponentDef[] }) {
  const header = components.find((c) => c.type === "HEADER");
  const body   = components.find((c) => c.type === "BODY");
  const footer = components.find((c) => c.type === "FOOTER");
  const btns   = components.find((c) => c.type === "BUTTONS");

  return (
    <div className="flex flex-col items-center">
      <div className="w-64 rounded-3xl border-4 border-gray-800 bg-gray-800 shadow-2xl overflow-hidden">
        <div className="bg-gray-800 px-4 py-1 flex justify-between text-white text-xs">
          <span>9:41</span><span>●●●</span>
        </div>
        <div className="bg-[#075E54] px-3 py-2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-green-300" />
          <span className="text-white text-sm font-medium">Preview</span>
        </div>
        <div className="bg-[#ece5dd] px-2 py-3 min-h-48 space-y-1">
          <div className="max-w-[90%] bg-white rounded-lg rounded-tl-none shadow-sm overflow-hidden">
            {header && (
              <div className="border-b border-gray-100">
                {header.format === "IMAGE" ? (
                  <div className="w-full h-28 bg-gray-200 flex items-center justify-center text-gray-400">
                    <Image size={32} />
                  </div>
                ) : (
                  <p className="px-2.5 pt-2.5 text-xs font-bold text-gray-800 leading-snug">
                    {header.text || <span className="italic text-gray-400">Header text…</span>}
                  </p>
                )}
              </div>
            )}
            <p className="px-2.5 py-2 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
              {body?.text || <span className="italic text-gray-400">Message body…</span>}
            </p>
            {footer?.text && (
              <p className="px-2.5 pb-2 text-[10px] text-gray-400">{footer.text}</p>
            )}
            <div className="flex justify-end px-2 pb-1">
              <span className="text-[9px] text-gray-400">9:41 AM ✓✓</span>
            </div>
          </div>
          {btns?.buttons && btns.buttons.length > 0 && (
            <div className="max-w-[90%] space-y-1">
              {btns.buttons.map((btn, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm py-2 text-center text-xs font-medium text-[#075E54] border border-gray-100">
                  {btn.text || "Button"}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateBuilder({
  credentialId, onClose, onSaved,
}: { credentialId: string; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("en");
  const [headerType, setHeaderType] = useState<"NONE" | "TEXT" | "IMAGE">("NONE");
  const [headerText, setHeaderText] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState<ButtonDef[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addVariable() {
    const idx = (bodyText.match(/\{\{\d+\}\}/g) ?? []).length + 1;
    setBodyText((tx) => tx + `{{${idx}}}`);
  }

  function addButton(type: ButtonDef["type"]) {
    if (buttons.length >= 3) return;
    setButtons((b) => [...b, { type, text: "" }]);
  }

  function updateButton(i: number, patch: Partial<ButtonDef>) {
    setButtons((bs) => bs.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  }

  function removeButton(i: number) {
    setButtons((bs) => bs.filter((_, idx) => idx !== i));
  }

  function buildComponents(): ComponentDef[] {
    const comps: ComponentDef[] = [];
    if (headerType !== "NONE") {
      comps.push({ type: "HEADER", format: headerType, ...(headerType === "TEXT" ? { text: headerText } : {}) });
    }
    if (bodyText.trim()) comps.push({ type: "BODY", text: bodyText });
    if (footerText.trim()) comps.push({ type: "FOOTER", text: footerText });
    if (buttons.length > 0) comps.push({ type: "BUTTONS", buttons });
    return comps;
  }

  async function handleSubmit() {
    setError("");
    if (!name) { setError(t("errTemplateNameRequired")); return; }
    if (!/^[a-z0-9_]+$/.test(name)) { setError(t("errTemplateNameFormat")); return; }
    if (!bodyText.trim()) { setError(t("errBodyRequired")); return; }
    if (buttons.some((b) => !b.text.trim())) { setError(t("errButtonTextsRequired")); return; }

    setSaving(true);
    try {
      await api.post("/api/templates/create", { credentialId, name, language, category, components: buildComponents() });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to submit template");
    } finally {
      setSaving(false);
    }
  }

  const previewComponents = buildComponents();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">{t("createTemplateTitle")}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition"><X size={18} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("templateNameLabel")}</label>
                <input value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="e.g. order_confirmed" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                <p className="text-xs text-gray-400 mt-1">{t("templateNameHint")}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("categoryLabel")}</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="MARKETING">{t("catMarketing")}</option>
                  <option value="UTILITY">{t("catUtility")}</option>
                  <option value="AUTHENTICATION">{t("catAuthentication")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("languageLabel")}</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="en">English</option>
                  <option value="en_US">English (US)</option>
                  <option value="en_GB">English (UK)</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt_BR">Portuguese (BR)</option>
                  <option value="ar">Arabic</option>
                  <option value="hi">Hindi</option>
                  <option value="ne">Nepali</option>
                  <option value="zh_CN">Chinese (Simplified)</option>
                </select>
              </div>
            </div>

            {/* Header */}
            <div className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Image size={16} className="text-purple-500" />
                {t("headerLabel")} <span className="text-gray-400 font-normal">{t("optionalLabel")}</span>
              </div>
              <div className="flex gap-2">
                {(["NONE", "TEXT", "IMAGE"] as const).map((tp) => (
                  <button key={tp} onClick={() => setHeaderType(tp)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${headerType === tp ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"}`}>
                    {tp === "NONE" ? t("none") : tp === "TEXT" ? t("text") : t("image")}
                  </button>
                ))}
              </div>
              {headerType === "TEXT" && (
                <input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder={t("headerTextPlaceholder")} maxLength={60} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              )}
              {headerType === "IMAGE" && (
                <div className="flex items-center gap-2 bg-gray-50 border border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-500">
                  <Image size={16} /> {t("imageUploadNote")}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <AlignLeft size={16} className="text-blue-500" />
                  {t("bodyLabel")} <span className="text-red-500">*</span>
                </div>
                <button onClick={addVariable} className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                  <Plus size={12} /> {t("addVariable")}
                </button>
              </div>
              <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder={t("bodyPlaceholder")} rows={5} maxLength={1024}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{t("bodyHint")}</span>
                <span>{bodyText.length}/1024</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Type size={16} className="text-gray-400" />
                {t("footerLabel")} <span className="text-gray-400 font-normal">{t("optionalLabel")}</span>
              </div>
              <input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder={t("footerPlaceholder")} maxLength={60}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>

            {/* Buttons */}
            <div className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Link2 size={16} className="text-orange-500" />
                  {t("buttonsLabel")} <span className="text-gray-400 font-normal">{t("buttonsOptional")}</span>
                </div>
                {buttons.length < 3 && (
                  <div className="flex gap-1">
                    <button onClick={() => addButton("QUICK_REPLY")} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1">
                      <MessageSquare size={11} /> {t("quickReply")}
                    </button>
                    <button onClick={() => addButton("URL")} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1">
                      <Link2 size={11} /> {t("urlButton")}
                    </button>
                    <button onClick={() => addButton("PHONE_NUMBER")} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1">
                      <Phone size={11} /> {t("callButton")}
                    </button>
                  </div>
                )}
              </div>
              {buttons.length === 0 && (
                <p className="text-xs text-gray-400 italic">{t("noButtonsAdded")}</p>
              )}
              {buttons.map((btn, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        {btn.type === "QUICK_REPLY" ? t("replyText") : t("buttonText")}
                      </label>
                      <input value={btn.text} onChange={(e) => updateButton(i, { text: e.target.value })}
                        placeholder={t("buttonLabelPlaceholder")} maxLength={25}
                        className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    {btn.type === "URL" && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">{t("urlButton")}</label>
                        <input value={btn.url ?? ""} onChange={(e) => updateButton(i, { url: e.target.value })}
                          placeholder="https://example.com" className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                    )}
                    {btn.type === "PHONE_NUMBER" && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">{t("colPhone")}</label>
                        <input value={btn.phone_number ?? ""} onChange={(e) => updateButton(i, { phone_number: e.target.value })}
                          placeholder="+1234567890" className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeButton(i)} className="mt-5 p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
            )}
          </div>

          {/* Preview */}
          <div className="w-72 border-l bg-gray-50 overflow-y-auto p-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Eye size={15} /> {t("livePreview")}
            </h3>
            <PhonePreview components={previewComponents} />
            <div className="text-xs text-gray-400 text-center">{t("previewUpdates")}</div>
          </div>
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-500">{t("templateSubmitNote")}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-100 transition">{t("cancel")}</button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2">
              {saving ? (<><RefreshCw size={14} className="animate-spin" /> {t("submittingTemplate")}</>) : (<><Send size={14} /> {t("submitToMeta")}</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ tpl, onDelete }: { tpl: Template; onDelete: () => void }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const body = tpl.components.find((c: any) => c.type === "BODY");
  const preview = body?.text?.substring(0, 80) ?? t("noBody");

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-gray-800">{tpl.name}</span>
            <StatusBadge status={tpl.status} />
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tpl.category}</span>
            <span className="text-xs text-gray-400">{tpl.language}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">{preview}{body?.text?.length > 80 ? "…" : ""}</p>
          <p className="text-xs text-gray-400 mt-1">{t("accountLabel")} {tpl.waCredential.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setExpanded((v) => !v)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            {expanded ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition"><Trash2 size={14} /></button>
        </div>
      </div>
      {expanded && (
        <div className="border-t bg-gray-50 px-4 py-4 flex gap-6">
          <div className="flex-1 space-y-2">
            {tpl.components.map((comp: any, i: number) => (
              <div key={i}>
                <span className="text-xs font-semibold text-gray-500">{comp.type}</span>
                {comp.format && <span className="ml-1 text-xs text-gray-400">({comp.format})</span>}
                {comp.text && <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">{comp.text}</p>}
                {comp.buttons && (
                  <div className="mt-1 space-y-0.5">
                    {comp.buttons.map((b: any, bi: number) => (
                      <div key={bi} className="text-xs text-blue-600">
                        [{b.type}] {b.text}{b.url ? ` → ${b.url}` : ""}{b.phone_number ? ` → ${b.phone_number}` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <PhonePreview components={tpl.components} />
        </div>
      )}
    </div>
  );
}

export default function TemplatesPage() {
  const t = useT();
  const [credId, setCredId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncErrors, setSyncErrors] = useState<{ name: string; error: string }[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [search, setSearch] = useState("");

  const { data: accsData } = useSWR("/api/accounts", fetcher);
  const accounts: WaCred[] = accsData?.data ?? [];

  const { data: tplData } = useSWR(
    `/api/templates${credId ? `?credentialId=${credId}` : ""}`,
    fetcher,
    { refreshInterval: 30000 }
  );
  const templates: Template[] = tplData?.data ?? [];

  const filtered = templates.filter((tp) => {
    if (statusFilter && tp.status !== statusFilter) return false;
    if (search && !tp.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleSync() {
    setSyncing(true);
    setSyncErrors([]);
    const errs: { name: string; error: string }[] = [];
    try {
      const creds = credId ? [credId] : accounts.map((a) => a.id);
      for (const cid of creds) {
        const accName = accounts.find((a) => a.id === cid)?.name ?? cid;
        try {
          await api.post("/api/templates/sync", { credentialId: cid });
        } catch (err: any) {
          errs.push({ name: accName, error: err.response?.data?.error ?? "Unknown error" });
        }
      }
      mutate(`/api/templates${credId ? `?credentialId=${credId}` : ""}`);
      if (errs.length > 0) setSyncErrors(errs);
    } catch (err: any) {
      setSyncErrors([{ name: "Sync", error: err.response?.data?.error ?? t("syncFailed") }]);
    } finally { setSyncing(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteLocallyConfirm"))) return;
    try {
      await api.delete(`/api/templates/${id}`);
      mutate(`/api/templates${credId ? `?credentialId=${credId}` : ""}`);
    } catch { alert(t("deleteFailed")); }
  }

  const counts = templates.reduce<Record<string, number>>((acc, tp) => {
    acc[tp.status] = (acc[tp.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("templatesTitle")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("templatesSubtitle")}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSync} disabled={syncing || accounts.length === 0}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? t("syncing") : t("syncFromMeta")}
          </button>
          <button onClick={() => setShowBuilder(true)} disabled={accounts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition">
            <Plus size={15} /> {t("newTemplate")}
          </button>
        </div>
      </div>

      {syncErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-red-700">Sync failed for {syncErrors.length} account{syncErrors.length > 1 ? "s" : ""}:</p>
            <button onClick={() => setSyncErrors([])} className="text-red-400 hover:text-red-600"><X size={14} /></button>
          </div>
          {syncErrors.map((e, i) => (
            <p key={i} className="text-xs text-red-700"><span className="font-medium">{e.name}:</span> {e.error}</p>
          ))}
          <p className="text-xs text-red-500 mt-1">This usually means the access token is expired. Re-import the account with a fresh token to fix it.</p>
        </div>
      )}

      {templates.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = counts[key] ?? 0;
            if (count === 0) return null;
            return (
              <button key={key} onClick={() => setStatusFilter(statusFilter === key ? "" : key)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${statusFilter === key ? "ring-2 ring-green-500 border-transparent" : "hover:border-gray-300"}`}>
                <cfg.Icon size={18} className={cfg.cls.replace("bg-", "text-").split(" ")[0].replace("100", "600")} />
                <div>
                  <div className="text-lg font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500">{cfg.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <select value={credId} onChange={(e) => setCredId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
          <option value="">{t("allAccounts")}</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.displayPhone ? ` (${a.displayPhone})` : ""}</option>)}
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchTemplates")}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 flex-1 min-w-48" />
        {statusFilter && (
          <button onClick={() => setStatusFilter("")} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
            <X size={13} /> {t("clearFilter")}
          </button>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("noAccountsConnected")}</p>
          <p className="text-xs mt-1">{t("goToSettingsImport")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{templates.length === 0 ? t("noTemplatesFound") : t("noTemplatesMatchFilter")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tpl) => <TemplateCard key={tpl.id} tpl={tpl} onDelete={() => handleDelete(tpl.id)} />)}
          <p className="text-xs text-gray-400 text-right">{t("showingXOfY", filtered.length, templates.length)}</p>
        </div>
      )}

      {showBuilder && accounts.length > 0 && (
        <BuilderWithAccount
          accounts={accounts}
          onClose={() => setShowBuilder(false)}
          onSaved={() => mutate(`/api/templates${credId ? `?credentialId=${credId}` : ""}`)}
        />
      )}
    </div>
  );
}

function BuilderWithAccount({ accounts, onClose, onSaved }: { accounts: WaCred[]; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [selectedCredId, setSelectedCredId] = useState(accounts[0]?.id ?? "");
  const [ready, setReady] = useState(accounts.length === 1);

  if (!ready) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl space-y-4">
          <h2 className="text-lg font-semibold">{t("chooseAccount")}</h2>
          <p className="text-sm text-gray-500">{t("chooseAccountMsg")}</p>
          <select value={selectedCredId} onChange={(e) => setSelectedCredId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.displayPhone ? ` (${a.displayPhone})` : ""}</option>)}
          </select>
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">{t("cancel")}</button>
            <button onClick={() => setReady(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              {t("continueBtn")} <ChevronRight size={14} className="inline" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <TemplateBuilder credentialId={selectedCredId} onClose={onClose} onSaved={onSaved} />;
}
