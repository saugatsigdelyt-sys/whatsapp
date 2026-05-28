"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import {
  Users, Phone, Megaphone, Settings, DollarSign,
  Search, Loader2, Plus, Trash2, CheckCircle, XCircle,
  Upload, Download, AlertCircle, RefreshCw, Wifi,
} from "lucide-react";

type Tab = "users" | "phones" | "my-accounts" | "announcements" | "settings";

// ── Users Tab ──────────────────────────────────────────────────────────────
function UsersTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editBalance, setEditBalance] = useState<{ id: string; name: string } | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceDesc, setBalanceDesc] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState<string>("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const { data, mutate } = useSWR(
    `/api/admin/users?search=${encodeURIComponent(search)}&page=${page}&limit=20`,
    (url: string) => api.get(url).then((r) => r.data)
  );

  const users = data?.data ?? [];
  const total = data?.total ?? 0;

  async function handlePlanChange(businessId: string, tier: string) {
    setPlanLoading(businessId + tier);
    setMsg(null);
    try {
      await api.patch(`/api/admin/users/${businessId}/plan`, { tier });
      setMsg({ text: `Plan updated to ${tier}`, ok: true });
      mutate();
    } catch (err: any) {
      setMsg({ text: err?.response?.data?.error ?? "Failed", ok: false });
    } finally {
      setPlanLoading("");
    }
  }

  async function handleBalanceSave() {
    if (!editBalance || !balanceAmount) return;
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount)) return;
    setBalanceLoading(true);
    try {
      await api.patch(`/api/admin/users/${editBalance.id}/balance`, { amount, description: balanceDesc || undefined });
      setMsg({ text: `Balance updated for ${editBalance.name}`, ok: true });
      setEditBalance(null);
      setBalanceAmount("");
      setBalanceDesc("");
      mutate();
    } catch (err: any) {
      setMsg({ text: err?.response?.data?.error ?? "Failed", ok: false });
    } finally {
      setBalanceLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`rounded-lg px-4 py-2 text-sm border ${msg.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.text}
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by email or name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
        <span className="text-sm text-gray-500">{total} users</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Business</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{u.name ?? "—"}</div>
                  <div className="text-gray-400 text-xs">{u.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-700">{u.business?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.business?.tier ?? "FREE"}
                    disabled={!u.business || !!planLoading}
                    onChange={(e) => handlePlanChange(u.business?.id, e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                  >
                    {["FREE", "STANDARD", "PREMIUM", "PLATINUM"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-800">${(u.business?.balance ?? 0).toFixed(2)}</td>
                <td className="px-4 py-3">
                  {u.business && (
                    <button
                      onClick={() => { setEditBalance({ id: u.business.id, name: u.name ?? u.email }); setMsg(null); }}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                    >
                      <DollarSign size={12} /> Edit Balance
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="px-4 py-10 text-center text-gray-400 text-sm">No users found</div>}
      </div>

      <div className="flex items-center justify-between">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-sm px-3 py-1 rounded border disabled:opacity-40">Prev</button>
        <span className="text-sm text-gray-500">Page {page} · {total} total</span>
        <button disabled={users.length < 20} onClick={() => setPage(p => p + 1)} className="text-sm px-3 py-1 rounded border disabled:opacity-40">Next</button>
      </div>

      {editBalance && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-900 mb-1">Edit Balance</h3>
            <p className="text-sm text-gray-500 mb-4">Adjust balance for <strong>{editBalance.name}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Amount (positive = credit, negative = debit)</label>
                <input type="number" step="0.01" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} placeholder="e.g. 50 or -10"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Description (optional)</label>
                <input type="text" value={balanceDesc} onChange={(e) => setBalanceDesc(e.target.value)} placeholder="e.g. Manual credit"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditBalance(null)} className="px-4 py-2 text-sm rounded-lg border text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleBalanceSave} disabled={balanceLoading || !balanceAmount}
                className="px-4 py-2 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2">
                {balanceLoading && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Platform Phones Tab ────────────────────────────────────────────────────
const CSV_TEMPLATE = `name,appId,appSecret,accessToken,wabaId,phoneNumberId,displayPhone,notes
Support Line 1,123456789,mysecret,EAAxxxxx,987654321,1122334455,+1 555 000 0001,Main support line
Sales Line 1,123456789,mysecret,EAAyyyyy,987654321,1122334456,+1 555 000 0002,Sales team`;

function PhonesTab() {
  const { data, mutate } = useSWR("/api/admin/platform-phones", (url: string) => api.get(url).then((r) => r.data));
  const { data: usersData } = useSWR("/api/admin/users?limit=100", (url: string) => api.get(url).then((r) => r.data));
  const phones = data?.data ?? [];
  const users = usersData?.data ?? [];

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", appId: "", appSecret: "", accessToken: "", wabaId: "", phoneNumberId: "", displayPhone: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // CSV bulk import state
  const [csvParsed, setCsvParsed] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "platform-phones-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { setCsvErrors(["CSV must have a header row and at least one data row"]); return; }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const required = ["name", "appid", "appsecret", "accesstoken", "wabaid", "phonenumberid"];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length) { setCsvErrors([`Missing columns: ${missing.join(", ")}`]); return; }

      const errors: string[] = [];
      const parsed: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
        const empty = required.filter((r) => !row[r]);
        if (empty.length) { errors.push(`Row ${i}: missing ${empty.join(", ")}`); continue; }
        parsed.push({
          name: row.name,
          appId: row.appid,
          appSecret: row.appsecret,
          accessToken: row.accesstoken,
          wabaId: row.wabaid,
          phoneNumberId: row.phonenumberid,
          displayPhone: row.displayphone || undefined,
          notes: row.notes || undefined,
        });
      }
      setCsvErrors(errors);
      setCsvParsed(parsed);
      setBulkResult(null);
    };
    reader.readAsText(file);
  }

  async function handleBulkImport() {
    if (!csvParsed.length) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await api.post("/api/admin/platform-phones/bulk", { phones: csvParsed });
      setBulkResult(res.data.message);
      setCsvParsed([]);
      setCsvErrors([]);
      if (fileRef.current) fileRef.current.value = "";
      mutate();
    } catch (err: any) {
      setBulkResult(err?.response?.data?.error ?? "Bulk import failed");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleAdd() {
    setLoading(true);
    setMsg(null);
    try {
      await api.post("/api/admin/platform-phones", form);
      setMsg({ text: "Phone added", ok: true });
      setShowAdd(false);
      setForm({ name: "", appId: "", appSecret: "", accessToken: "", wabaId: "", phoneNumberId: "", displayPhone: "", notes: "" });
      mutate();
    } catch (err: any) {
      setMsg({ text: err?.response?.data?.error ?? "Failed", ok: false });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(phoneId: string) {
    if (!confirm("Delete this platform phone?")) return;
    await api.delete(`/api/admin/platform-phones/${phoneId}`);
    mutate();
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-lg px-4 py-2 text-sm border ${msg.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* CSV Bulk Import */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2"><Upload size={16} /> Bulk Import via CSV</h3>
        <p className="text-sm text-gray-500 mb-4">Upload a CSV file to import multiple phones at once.</p>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium">
            <Download size={14} /> Download CSV Template
          </button>
        </div>
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCsvFile}
            className="flex-1 text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
          {csvParsed.length > 0 && (
            <button onClick={handleBulkImport} disabled={bulkLoading}
              className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Import {csvParsed.length} phones
            </button>
          )}
        </div>
        {csvErrors.length > 0 && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
            {csvErrors.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-red-700"><AlertCircle size={12} className="mt-0.5 shrink-0" />{e}</div>
            ))}
          </div>
        )}
        {csvParsed.length > 0 && !bulkResult && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            ✓ {csvParsed.length} rows parsed successfully{csvErrors.length > 0 ? `, ${csvErrors.length} rows skipped` : ""}. Click "Import" to proceed.
          </div>
        )}
        {bulkResult && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 font-medium">{bulkResult}</div>
        )}
      </div>

      {/* Single Add + Phone List */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{phones.length} platform phones</p>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          <Plus size={16} /> Add Single Phone
        </button>
      </div>

      <div className="space-y-3">
        {phones.map((p: any) => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-gray-900">{p.name}</div>
                <div className="text-sm text-gray-500">{p.displayPhone ?? p.phoneNumberId}</div>
                {p.notes && <div className="text-xs text-gray-400 mt-1">{p.notes}</div>}
              </div>
              <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2 font-medium">Assigned to:</p>
              {p.assignments?.length === 0 && <p className="text-xs text-gray-400">Not assigned yet</p>}
              <div className="flex flex-wrap gap-2 mb-2">
                {p.assignments?.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5 text-xs">
                    {a.business?.name}
                    <button onClick={() => api.delete(`/api/admin/platform-phones/${p.id}/assign/${a.business?.id}`).then(() => mutate())} className="text-red-400 hover:text-red-600 ml-0.5">×</button>
                  </div>
                ))}
              </div>
              <select className="border border-gray-200 rounded-lg px-2 py-1 text-xs" defaultValue=""
                onChange={(e) => { if (e.target.value) { api.post(`/api/admin/platform-phones/${p.id}/assign`, { businessId: e.target.value }).then(() => mutate()); e.target.value = ""; } }}>
                <option value="">Assign to business…</option>
                {users.filter((u: any) => u.business && !p.assignments?.find((a: any) => a.business?.id === u.business?.id)).map((u: any) => (
                  <option key={u.business?.id} value={u.business?.id}>{u.business?.name} ({u.email})</option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {phones.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No platform phones yet — import via CSV or add one manually.</p>}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 mb-4">Add Platform Phone</h3>
            <div className="space-y-3">
              {[
                { key: "name", label: "Name", placeholder: "e.g. Support Line 1" },
                { key: "appId", label: "App ID", placeholder: "Meta App ID" },
                { key: "appSecret", label: "App Secret", placeholder: "••••••" },
                { key: "accessToken", label: "Access Token", placeholder: "EAAxxxxxxx" },
                { key: "wabaId", label: "WABA ID", placeholder: "WhatsApp Business Account ID" },
                { key: "phoneNumberId", label: "Phone Number ID", placeholder: "Meta phone number ID" },
                { key: "displayPhone", label: "Display Phone (optional)", placeholder: "+1 555 000 0000" },
                { key: "notes", label: "Notes (optional)", placeholder: "Internal notes" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 block mb-1">{label}</label>
                  <input type={key.includes("Secret") || key.includes("Token") ? "password" : "text"}
                    value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm rounded-lg border text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAdd} disabled={loading}
                className="px-4 py-2 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2">
                {loading && <Loader2 size={14} className="animate-spin" />} Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Announcements Tab ──────────────────────────────────────────────────────
function AnnouncementsTab() {
  const { data, mutate } = useSWR("/api/admin/announcements", (url: string) => api.get(url).then((r) => r.data));
  const announcements = data?.data ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", type: "info", active: true });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const TYPE_COLORS: Record<string, string> = {
    info: "bg-blue-50 border-blue-200 text-blue-700",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
    success: "bg-green-50 border-green-200 text-green-700",
    error: "bg-red-50 border-red-200 text-red-700",
  };

  async function handleCreate() {
    setLoading(true);
    try {
      await api.post("/api/admin/announcements", form);
      setMsg("Announcement created");
      setShowAdd(false);
      setForm({ title: "", body: "", type: "info", active: true });
      mutate();
    } catch (err: any) {
      setMsg(err?.response?.data?.error ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {msg && <div className="bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-4 py-2 text-sm">{msg}</div>}
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
          <Plus size={16} /> New Announcement
        </button>
      </div>
      <div className="space-y-3">
        {announcements.map((a: any) => (
          <div key={a.id} className={`border rounded-xl p-4 ${TYPE_COLORS[a.type] ?? TYPE_COLORS.info}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{a.title}</div>
                <div className="text-sm mt-1">{a.body}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {a.active ? "Active" : "Inactive"}
                </span>
                <button onClick={() => api.patch(`/api/admin/announcements/${a.id}`, { active: !a.active }).then(() => mutate())}
                  className="text-gray-500 hover:text-gray-800">
                  {a.active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                </button>
                <button onClick={() => { if (confirm("Delete?")) api.delete(`/api/admin/announcements/${a.id}`).then(() => mutate()); }}
                  className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
        {announcements.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No announcements yet</p>}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-900 mb-4">New Announcement</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Title</label>
                <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Message</label>
                <textarea rows={3} value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                  <option value="info">Info (blue)</option>
                  <option value="warning">Warning (yellow)</option>
                  <option value="success">Success (green)</option>
                  <option value="error">Error (red)</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm(f => ({ ...f, active: e.target.checked }))} />
                Show immediately
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm rounded-lg border text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={loading || !form.title || !form.body}
                className="px-4 py-2 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2">
                {loading && <Loader2 size={14} className="animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Accounts Tab ────────────────────────────────────────────────────────
function MyAccountsTab() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [healthFilter, setHealthFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const url = `/api/admin/my-accounts?page=${page}&limit=${limit}${healthFilter !== "ALL" ? `&health=${healthFilter}` : ""}`;
  const { data, mutate } = useSWR(url, (u: string) => api.get(u).then((r) => r.data));

  const accounts = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const summary = data?.summary ?? { healthy: 0, error: 0, locked: 0 };
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const allSelected = accounts.length > 0 && selectedIds.size === accounts.length;
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(accounts.map((a: any) => a.id)));
  }
  function toggleOne(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleRefresh(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setRefreshingId(id);
    setMsg(null);
    try {
      await api.post(`/api/admin/my-accounts/${id}/refresh`);
      mutate();
    } catch (err: any) {
      setMsg({ text: err?.response?.data?.error ?? "Refresh failed", ok: false });
    } finally {
      setRefreshingId(null);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this account and all its phone numbers?")) return;
    try {
      await api.delete(`/api/admin/my-accounts/${id}`);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      mutate();
    } catch (err: any) {
      setMsg({ text: err?.response?.data?.error ?? "Delete failed", ok: false });
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} account(s) and their phone numbers?`)) return;
    try {
      await api.post("/api/admin/my-accounts/bulk-delete", { ids: [...selectedIds] });
      setSelectedIds(new Set());
      mutate();
    } catch (err: any) {
      setMsg({ text: err?.response?.data?.error ?? "Delete failed", ok: false });
    }
  }

  const HEALTH_CFG: Record<string, { bg: string; text: string; border: string; label: string }> = {
    HEALTHY: { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  label: "Healthy" },
    ERROR:   { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    label: "Error"   },
    LOCKED:  { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Locked"  },
  };
  function HealthBadge({ health }: { health: string }) {
    const c = HEALTH_CFG[health] ?? HEALTH_CFG.ERROR;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
        {c.label}
      </span>
    );
  }

  return (
    <div className="space-y-5">
      {msg && (
        <div className={`rounded-lg px-4 py-2 text-sm border ${msg.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Healthy", count: summary.healthy, ...HEALTH_CFG.HEALTHY },
          { label: "Error",   count: summary.error,   ...HEALTH_CFG.ERROR   },
          { label: "Locked",  count: summary.locked,  ...HEALTH_CFG.LOCKED  },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
            <div className={`text-2xl font-bold ${c.text}`}>{c.count}</div>
            <div className={`text-xs mt-0.5 font-medium ${c.text}`}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + per-page */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {["ALL", "HEALTHY", "ERROR", "LOCKED"].map((f) => (
            <button key={f} onClick={() => { setHealthFilter(f); setPage(1); setSelectedIds(new Set()); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                healthFilter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Per page:</span>
          {[10, 20, 100].map((n) => (
            <button key={n} onClick={() => { setLimit(n); setPage(1); setSelectedIds(new Set()); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                limit === n ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Numbers</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Health</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Webhook</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Verified</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {accounts.map((a: any) => (
              <tr key={a.id}
                className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedIds.has(a.id) ? "bg-blue-50" : ""}`}
                onClick={() => toggleOne(a.id)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleOne(a.id)} className="rounded" />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{a.name}</div>
                  <div className="text-xs text-gray-400">WABA: {a.wabaId}</div>
                </td>
                <td className="px-4 py-3">
                  {a.phoneNumbers?.length === 0
                    ? <span className="text-xs text-gray-400">—</span>
                    : <div className="space-y-0.5">
                        {a.phoneNumbers.map((p: any) => (
                          <div key={p.id} className="text-xs text-gray-600">{p.displayPhone ?? p.id}</div>
                        ))}
                      </div>
                  }
                </td>
                <td className="px-4 py-3">
                  <HealthBadge health={a.health} />
                  {a.webhookError && (
                    <div className="text-xs text-red-500 mt-1 max-w-[180px] truncate" title={a.webhookError}>
                      {a.webhookError}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${a.webhookRegistered ? "text-green-600" : "text-red-500"}`}>
                    {a.webhookRegistered ? "✓ Registered" : "✗ Not registered"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {a.lastVerifiedAt ? new Date(a.lastVerifiedAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <button onClick={(e) => handleRefresh(a.id, e)} disabled={refreshingId === a.id}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium disabled:opacity-50">
                      <RefreshCw size={11} className={refreshingId === a.id ? "animate-spin" : ""} /> Refresh
                    </button>
                    <button onClick={(e) => handleDelete(a.id, e)}
                      className="flex items-center gap-1 text-xs text-red-500 hover:underline font-medium">
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {accounts.length === 0 && (
          <div className="px-4 py-10 text-center text-gray-400 text-sm">
            No accounts{healthFilter !== "ALL" ? ` with status ${healthFilter}` : ""}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
          className="text-sm px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
          ← Prev
        </button>
        <span className="text-sm text-gray-500">Page {page} of {totalPages} · {total} total</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
          className="text-sm px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
          Next →
        </button>
      </div>

      {/* Floating bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 shadow-2xl"
          style={{ background: "var(--color-ink, #1a1a1a)" }}>
          <span className="text-sm font-medium text-white">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
            <Trash2 size={13} /> Delete All
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="text-gray-400 hover:text-white text-xl leading-none font-light">×</button>
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ───────────────────────────────────────────────────────────
function SettingsTab() {
  const { data, mutate } = useSWR("/api/admin/settings", (url: string) => api.get(url).then((r) => r.data));
  const s = data?.data;
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (s && !initialized) {
    setForm({
      priceStandard: s.priceStandard, pricePremium: s.pricePremium, pricePlatinum: s.pricePlatinum,
      minDeposit: s.minDeposit,
      maxWaFree: s.maxWaFree, maxWaStandard: s.maxWaStandard, maxWaPremium: s.maxWaPremium, maxWaPlatinum: s.maxWaPlatinum,
      maxTeamFree: s.maxTeamFree, maxTeamStandard: s.maxTeamStandard, maxTeamPremium: s.maxTeamPremium, maxTeamPlatinum: s.maxTeamPlatinum,
      registrationEnabled: s.registrationEnabled,
    });
    setInitialized(true);
  }

  function numField(key: string) {
    return {
      value: form[key] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f: any) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSave() {
    setLoading(true);
    setMsg(null);
    try {
      const payload: Record<string, any> = { registrationEnabled: form.registrationEnabled };
      const numKeys = ["priceStandard", "pricePremium", "pricePlatinum", "minDeposit",
        "maxWaFree", "maxWaStandard", "maxWaPremium", "maxWaPlatinum",
        "maxTeamFree", "maxTeamStandard", "maxTeamPremium", "maxTeamPlatinum"];
      for (const k of numKeys) { if (form[k] !== "" && form[k] !== undefined) payload[k] = parseFloat(form[k]); }
      await api.patch("/api/admin/settings", payload);
      setMsg({ text: "Settings saved successfully", ok: true });
      mutate();
    } catch (err: any) {
      setMsg({ text: err?.response?.data?.error ?? "Failed to save", ok: false });
    } finally {
      setLoading(false);
    }
  }

  const tiers = [
    { key: "Free", label: "Free", color: "text-gray-600" },
    { key: "Standard", label: "Standard", color: "text-blue-600" },
    { key: "Premium", label: "Premium", color: "text-purple-600" },
    { key: "Platinum", label: "Platinum", color: "text-yellow-600" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {msg && (
        <div className={`rounded-lg px-4 py-2 text-sm border ${msg.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Registration toggle */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Public Registration</h3>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-gray-700">Allow new user registrations</p>
            <p className="text-xs text-gray-400 mt-0.5">When off, the register page shows a "closed" message</p>
          </div>
          <div
            onClick={() => setForm((f: any) => ({ ...f, registrationEnabled: !f.registrationEnabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${form.registrationEnabled ? "bg-green-500" : "bg-gray-300"}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.registrationEnabled ? "translate-x-7" : "translate-x-1"}`} />
          </div>
        </label>
        <p className="text-xs mt-2 font-medium" style={{ color: form.registrationEnabled ? "#16a34a" : "#dc2626" }}>
          {form.registrationEnabled ? "✓ Registration is OPEN" : "✗ Registration is CLOSED"}
        </p>
      </div>

      {/* Pricing */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Plan Pricing (USD/month)</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "priceStandard", label: "Standard" },
            { key: "pricePremium", label: "Premium" },
            { key: "pricePlatinum", label: "Platinum" },
            { key: "minDeposit", label: "Min Deposit" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 block mb-1">{label}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min={0} step={0.01} {...numField(key)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier limits */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Plan Limits</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="pb-2 text-center text-xs font-semibold text-gray-500 uppercase">WA Accounts</th>
                <th className="pb-2 text-center text-xs font-semibold text-gray-500 uppercase">Team Members</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tiers.map(({ key, label, color }) => (
                <tr key={key}>
                  <td className={`py-2 pr-4 font-semibold ${color}`}>{label}</td>
                  <td className="py-2 px-2">
                    <input type="number" min={0} {...numField(`maxWa${key}`)}
                      className="w-full text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                  </td>
                  <td className="py-2 pl-2">
                    <input type="number" min={0} {...numField(`maxTeam${key}`)}
                      className="w-full text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={handleSave} disabled={loading}
        className="w-full bg-brand-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2">
        {loading && <Loader2 size={14} className="animate-spin" />} Save All Settings
      </button>
    </div>
  );
}

// ── Main Admin Page ────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "users",       label: "Users & Plans",    icon: <Users size={16} />    },
    { id: "my-accounts", label: "My Accounts",      icon: <Wifi size={16} />     },
    { id: "phones",      label: "Platform Phones",  icon: <Phone size={16} />    },
    { id: "announcements", label: "Announcements",  icon: <Megaphone size={16} /> },
    { id: "settings",    label: "Settings",         icon: <Settings size={16} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 mt-1">Platform management</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "users"        && <UsersTab />}
        {tab === "my-accounts"  && <MyAccountsTab />}
        {tab === "phones"       && <PhonesTab />}
        {tab === "announcements" && <AnnouncementsTab />}
        {tab === "settings"     && <SettingsTab />}
      </div>
    </div>
  );
}
