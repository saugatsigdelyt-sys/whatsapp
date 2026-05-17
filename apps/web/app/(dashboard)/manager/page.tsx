"use client";

import { useState } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { Users, Phone, DollarSign, Search, Loader2, Plus, Trash2 } from "lucide-react";

type Tab = "users" | "phones";

// ── Users Tab (subset of admin) ────────────────────────────────────────────
function UsersTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editBalance, setEditBalance] = useState<{ id: string; name: string } | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceDesc, setBalanceDesc] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);

  const { data, mutate } = useSWR(
    `/api/admin/users?search=${search}&page=${page}&limit=20`,
    (url: string) => api.get(url).then((r) => r.data)
  );

  const users = data?.data ?? [];
  const total = data?.total ?? 0;

  async function handlePlanChange(businessId: string, tier: string) {
    setPlanLoading(businessId + tier);
    setMsg(null);
    try {
      await api.patch(`/api/admin/users/${businessId}/plan`, { tier });
      setMsg(`Plan updated to ${tier}`);
      mutate();
    } catch (err: any) {
      setMsg(err?.response?.data?.error ?? "Failed");
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
      setMsg(`Balance updated for ${editBalance.name}`);
      setEditBalance(null);
      setBalanceAmount("");
      setBalanceDesc("");
      mutate();
    } catch (err: any) {
      setMsg(err?.response?.data?.error ?? "Failed");
    } finally {
      setBalanceLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {msg && <div className="bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-4 py-2 text-sm">{msg}</div>}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
        <span className="text-sm text-gray-500">{total} users</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                <td className="px-4 py-3">
                  <div className="text-gray-700">{u.business?.name ?? "—"}</div>
                </td>
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
                <td className="px-4 py-3">
                  <span className="font-semibold text-gray-800">${(u.business?.balance ?? 0).toFixed(2)}</span>
                </td>
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
        <span className="text-sm text-gray-500">Page {page}</span>
        <button disabled={users.length < 20} onClick={() => setPage(p => p + 1)} className="text-sm px-3 py-1 rounded border disabled:opacity-40">Next</button>
      </div>

      {editBalance && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-900 mb-1">Edit Balance</h3>
            <p className="text-sm text-gray-500 mb-4">Adjust balance for {editBalance.name}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Amount (positive = credit, negative = debit)</label>
                <input
                  type="number"
                  step="0.01"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="e.g. 50 or -10"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={balanceDesc}
                  onChange={(e) => setBalanceDesc(e.target.value)}
                  placeholder="e.g. Manual credit"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditBalance(null)} className="px-4 py-2 text-sm rounded-lg border text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleBalanceSave}
                disabled={balanceLoading || !balanceAmount}
                className="px-4 py-2 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
              >
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
function PhonesTab() {
  const { data, mutate } = useSWR("/api/admin/platform-phones", (url: string) => api.get(url).then((r) => r.data));
  const { data: usersData } = useSWR("/api/admin/users?limit=100", (url: string) => api.get(url).then((r) => r.data));
  const phones = data?.data ?? [];
  const users = usersData?.data ?? [];
  const [assignLoading, setAssignLoading] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleAssign(phoneId: string, businessId: string) {
    setAssignLoading(phoneId + businessId);
    try {
      await api.post(`/api/admin/platform-phones/${phoneId}/assign`, { businessId });
      setMsg("Assigned");
      mutate();
    } catch (err: any) {
      setMsg(err?.response?.data?.error ?? "Failed");
    } finally {
      setAssignLoading("");
    }
  }

  return (
    <div className="space-y-4">
      {msg && <div className="bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-4 py-2 text-sm">{msg}</div>}
      <p className="text-sm text-gray-500">{phones.length} platform phones available</p>
      <div className="space-y-3">
        {phones.map((p: any) => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="font-medium text-gray-900">{p.name}</div>
            <div className="text-sm text-gray-500">{p.displayPhone ?? p.phoneNumberId}</div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2 font-medium">Currently assigned to:</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {p.assignments?.map((a: any) => (
                  <span key={a.id} className="bg-gray-100 rounded-full px-2 py-0.5 text-xs">{a.business?.name}</span>
                ))}
                {p.assignments?.length === 0 && <span className="text-xs text-gray-400">Not assigned</span>}
              </div>
              <select
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                defaultValue=""
                onChange={(e) => { if (e.target.value) handleAssign(p.id, e.target.value); e.target.value = ""; }}
              >
                <option value="">Assign to business…</option>
                {users.filter((u: any) => u.business && !p.assignments?.find((a: any) => a.business?.id === u.business?.id)).map((u: any) => (
                  <option key={u.business?.id} value={u.business?.id}>{u.business?.name} ({u.email})</option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {phones.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No platform phones imported yet</p>}
      </div>
    </div>
  );
}

// ── Main Manager Page ──────────────────────────────────────────────────────
export default function ManagerPage() {
  const [tab, setTab] = useState<Tab>("users");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "users", label: "Users & Plans", icon: <Users size={16} /> },
    { id: "phones", label: "Platform Phones", icon: <Phone size={16} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Panel</h1>
        <p className="text-gray-500 mt-1">Platform management — manager@whatsapi.buzz</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "users" && <UsersTab />}
        {tab === "phones" && <PhonesTab />}
      </div>
    </div>
  );
}
