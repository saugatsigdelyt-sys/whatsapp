"use client";

import { useState, useRef } from "react";
import useSWR, { mutate } from "swr";
import api from "@/lib/api";
import { Upload, Send, CheckCircle, AlertCircle, Clock, X, Download } from "lucide-react";

function fetcher(url: string) { return api.get(url).then((r) => r.data); }

interface WaCred { id: string; name: string; displayPhone: string | null; }
interface Template { id: string; name: string; language: string; category: string; status: string; components: any[]; }
interface Job {
  id: string; status: string; totalCount: number; sentCount: number; failedCount: number;
  createdAt: string; completedAt: string | null;
  template: { name: string; status: string } | null;
  waCredential: { name: string };
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700", RUNNING: "bg-blue-100 text-blue-700",
  FAILED: "bg-red-100 text-red-700", PENDING: "bg-gray-100 text-gray-600",
};

function parseCSV(text: string): string[] {
  return text.split(/[\r\n]+/).map((l) => l.split(",")[0].trim().replace(/\D/g, "")).filter((p) => p.length >= 7);
}

export default function BulkSendPage() {
  const [step, setStep] = useState(1);
  const [credId, setCredId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [phones, setPhones] = useState<string[]>([]);
  const [rawInput, setRawInput] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: accsData } = useSWR("/api/accounts", fetcher);
  const accounts: WaCred[] = accsData?.data ?? [];

  const { data: tplData } = useSWR(credId ? `/api/templates?credentialId=${credId}` : null, fetcher);
  const allTemplates: Template[] = tplData?.data ?? [];
  const approvedTemplates = allTemplates.filter((t) => t.status === "APPROVED");

  const { data: jobsData } = useSWR("/api/bulk-send", fetcher, { refreshInterval: 5000 });
  const jobs: Job[] = jobsData?.data ?? [];

  const selectedTemplate = approvedTemplates.find((t) => t.id === templateId);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setPhones(parsed);
      setRawInput(parsed.join("\n"));
    };
    reader.readAsText(file);
  }

  function handleRawInput(val: string) {
    setRawInput(val);
    const parsed = val.split(/[\r\n,]+/).map((p) => p.trim().replace(/\D/g, "")).filter((p) => p.length >= 7);
    setPhones([...new Set(parsed)]);
  }

  async function handleSync() {
    if (!credId) return;
    setSyncing(true);
    try {
      await api.post("/api/templates/sync", { credentialId: credId });
      mutate(`/api/templates?credentialId=${credId}`);
    } catch { alert("Sync failed"); }
    finally { setSyncing(false); }
  }

  async function handleSend() {
    if (!credId || !templateId || phones.length === 0) return;
    setSending(true);
    setResult(null);
    try {
      const { data } = await api.post("/api/bulk-send/send", {
        credentialId: credId,
        templateId,
        recipients: phones.map((p) => ({ phone: p })),
      });
      setResult({ success: true, message: `Bulk send started! Job ID: ${data.data.jobId}` });
      mutate("/api/bulk-send");
      setStep(1);
      setPhones([]);
      setRawInput("");
      setTemplateId("");
    } catch (err: any) {
      setResult({ success: false, message: err.response?.data?.error ?? "Failed to start bulk send" });
    } finally { setSending(false); }
  }

  function downloadExample() {
    const csv = "phone\n447700900000\n447700900001\n447700900002";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "recipients-example.csv";
    a.click();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Bulk Send</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send approved WhatsApp templates to a list of recipients</p>
      </div>

      {result && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${result.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {result.success ? <CheckCircle size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
          <span>{result.message}</span>
          <button onClick={() => setResult(null)} className="ml-auto"><X size={13} /></button>
        </div>
      )}

      {/* Steps */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        {/* Step 1: Select phone */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${credId ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-600"}`}>1</span>
            <span className="font-medium text-gray-800">Select WhatsApp Account</span>
          </div>
          <select value={credId} onChange={(e) => { setCredId(e.target.value); setTemplateId(""); setPhones([]); }}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">— Choose account —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} {a.displayPhone ? `(${a.displayPhone})` : ""}</option>)}
          </select>
        </div>

        {/* Step 2: Select template */}
        {credId && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${templateId ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-600"}`}>2</span>
              <span className="font-medium text-gray-800">Select Approved Template</span>
              <button onClick={handleSync} disabled={syncing} className="ml-auto text-xs text-brand-600 hover:underline">
                {syncing ? "Syncing…" : "↻ Sync from Meta"}
              </button>
            </div>
            {approvedTemplates.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                No approved templates found. Go to <a href="/dashboard/templates" className="underline font-medium">Templates</a> to create and get approval, or click "Sync from Meta" above.
              </div>
            ) : (
              <div className="grid gap-2">
                {approvedTemplates.map((t) => (
                  <label key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${templateId === t.id ? "border-brand-400 bg-brand-50" : "border-gray-200 hover:bg-gray-50"}`}>
                    <input type="radio" name="template" value={t.id} checked={templateId === t.id} onChange={() => setTemplateId(t.id)} className="mt-0.5 accent-brand-600" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-gray-800">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.category} · {t.language}</div>
                    </div>
                    <span className="shrink-0 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">APPROVED</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Upload recipients */}
        {credId && templateId && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${phones.length > 0 ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-600"}`}>3</span>
              <span className="font-medium text-gray-800">Upload Recipients</span>
              <button onClick={downloadExample} className="ml-auto flex items-center gap-1 text-xs text-brand-600 hover:underline">
                <Download size={11} /> Example CSV
              </button>
            </div>
            <div className="space-y-3">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
              >
                <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Click to upload CSV</p>
                <p className="text-xs text-gray-400 mt-1">One phone number per row. International format (e.g. 447700900000)</p>
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              </div>
              <div className="text-center text-xs text-gray-400">or paste numbers below</div>
              <textarea
                value={rawInput}
                onChange={(e) => handleRawInput(e.target.value)}
                placeholder="447700900000&#10;447700900001&#10;447700900002"
                rows={5}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {phones.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={15} className="text-green-500" />
                  <span className="text-green-700 font-medium">{phones.length} unique numbers ready</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Send */}
        {credId && templateId && phones.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-4">
              ⚠️ This will send the <strong>{selectedTemplate?.name}</strong> template to <strong>{phones.length} numbers</strong>. WhatsApp charges per message. Make sure your recipients have opted in.
            </div>
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              <Send size={16} />
              {sending ? "Starting bulk send…" : `Send to ${phones.length} recipients`}
            </button>
          </div>
        )}
      </div>

      {/* Job history */}
      {jobs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Send History</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <div key={job.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{job.template?.name ?? "—"}</div>
                  <div className="text-xs text-gray-400">{job.waCredential.name} · {new Date(job.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-xs text-gray-500 text-right shrink-0">
                  <div>{job.sentCount}/{job.totalCount} sent</div>
                  {job.failedCount > 0 && <div className="text-red-500">{job.failedCount} failed</div>}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {job.status === "RUNNING" ? <span className="flex items-center gap-1"><Clock size={10} className="animate-spin" /> Running</span> : job.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
