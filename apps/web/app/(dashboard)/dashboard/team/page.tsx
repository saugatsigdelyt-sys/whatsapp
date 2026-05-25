"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import api from "@/lib/api";
import { useT } from "@/lib/i18n";
import { UserPlus, Trash2, ChevronUp, X, CheckCircle, AlertCircle, Shield, Eye, Crown } from "lucide-react";

function fetcher(url: string) { return api.get(url).then((r) => r.data); }

interface WaAccount { id: string; name: string; wabaId: string; }
interface TeamMember {
  id: string; role: "OWNER" | "ADMIN" | "VIEWER"; createdAt: string;
  isCurrentUser: boolean; user: { id: string; email: string; name: string | null };
  waAccounts: WaAccount[];
}

export default function TeamPage() {
  const t = useT();
  const { data: membersData, isLoading } = useSWR("/api/team", fetcher);
  const { data: accountsData } = useSWR("/api/accounts", fetcher);
  const { data: subData } = useSWR("/api/subscription", fetcher);

  const members: TeamMember[] = membersData?.data ?? [];
  const allAccounts: WaAccount[] = accountsData?.data ?? [];
  const sub = subData?.data ?? null;

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", password: "", role: "VIEWER" as "ADMIN" | "VIEWER", waCredentialIds: [] as string[] });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success: boolean; message: string } | null>(null);
  const [editingAccessId, setEditingAccessId] = useState<string | null>(null);
  const [accessSelection, setAccessSelection] = useState<string[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  const atLimit = sub ? !sub.canAddTeamMember : false;

  // Role badge config using translation keys
  const ROLE_BADGES: Record<string, { labelKey: string; icon: typeof Crown; className: string }> = {
    OWNER:  { labelKey: "roleOwner",  icon: Crown,  className: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
    ADMIN:  { labelKey: "roleAdmin",  icon: Shield, className: "bg-blue-50 text-blue-700 border border-blue-200" },
    VIEWER: { labelKey: "roleViewer", icon: Eye,    className: "bg-gray-50 text-gray-600 border border-gray-200" },
  };

  function toggleAccount(credId: string, selected: string[], setSelected: (v: string[]) => void) {
    setSelected(selected.includes(credId) ? selected.filter((id) => id !== credId) : [...selected, credId]);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteResult(null);
    try {
      const { data } = await api.post("/api/team/invite", inviteForm);
      setInviteResult({ success: true, message: data.message });
      setInviteForm({ name: "", email: "", password: "", role: "VIEWER", waCredentialIds: [] });
      setShowInvite(false);
      mutate("/api/team");
      mutate("/api/subscription");
    } catch (err: any) {
      setInviteResult({ success: false, message: err.response?.data?.error ?? "Invite failed" });
    } finally { setInviteLoading(false); }
  }

  async function handleRemove(memberId: string, name: string) {
    if (!confirm(t("confirmRemoveMember", name))) return;
    try {
      await api.delete(`/api/team/${memberId}`);
      mutate("/api/team");
      mutate("/api/subscription");
    } catch (err: any) { alert(err.response?.data?.error ?? t("failedToRemoveMember")); }
  }

  async function saveAccess(memberId: string) {
    setAccessLoading(true);
    try {
      await api.put(`/api/team/${memberId}/access`, { waCredentialIds: accessSelection });
      mutate("/api/team");
      setEditingAccessId(null);
    } catch { alert(t("failedToUpdateAccess")); }
    finally { setAccessLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t("teamTitle")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("teamSubtitle")}</p>
      </div>

      {sub && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{sub.usage.teamMembers}</span>{" "}
              {t("teamUsage", sub.usage.teamMembers, sub.limits.maxTeamMembers === Infinity ? "∞" : String(sub.limits.maxTeamMembers))}
            </span>
            <a href="/pricing" className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1"><ChevronUp size={12} /> {t("upgradeForMoreSeats")}</a>
          </div>
        </div>
      )}

      {inviteResult && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${inviteResult.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {inviteResult.success ? <CheckCircle size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
          <span>{inviteResult.message}</span>
          <button onClick={() => setInviteResult(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      {isLoading ? <div className="text-sm text-gray-400">{t("loadingTeam")}</div> : (
        <div className="space-y-3">
          {members.map((member) => {
            const badge = ROLE_BADGES[member.role];
            const BadgeIcon = badge.icon;
            const isEditingAccess = editingAccessId === member.id;
            return (
              <div key={member.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center font-semibold text-gray-600 text-sm shrink-0">
                    {(member.user.name ?? member.user.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">
                        {member.user.name ?? "—"}
                        {member.isCurrentUser && <span className="text-xs text-gray-400 ml-1">{t("youLabel")}</span>}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
                        <BadgeIcon size={10} /> {t(badge.labelKey)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{member.user.email}</div>
                    {member.role !== "OWNER" && (
                      <div className="mt-3">
                        {isEditingAccess ? (
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-2">{t("selectAccountsForMember")}</p>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {allAccounts.map((acc) => (
                                <label key={acc.id} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border cursor-pointer ${accessSelection.includes(acc.id) ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600"}`}>
                                  <input type="checkbox" checked={accessSelection.includes(acc.id)} onChange={() => toggleAccount(acc.id, accessSelection, setAccessSelection)} className="accent-brand-600" />
                                  <span className="truncate font-medium">{acc.name}</span>
                                </label>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => saveAccess(member.id)} disabled={accessLoading} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-60">{accessLoading ? t("savingAccess") : t("saveAccess")}</button>
                              <button onClick={() => setEditingAccessId(null)} className="text-xs text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200">{t("cancel")}</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            {member.waAccounts.length > 0 ? member.waAccounts.map((acc) => (
                              <span key={acc.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{acc.name}</span>
                            )) : <span className="text-xs text-gray-400 italic">{t("noAccountAccessAssigned")}</span>}
                            <button onClick={() => { setEditingAccessId(member.id); setAccessSelection(member.waAccounts.map((a) => a.id)); }} className="text-xs text-brand-600 hover:underline font-medium">{t("editAccess")}</button>
                          </div>
                        )}
                      </div>
                    )}
                    {member.role === "OWNER" && <div className="mt-2 text-xs text-gray-400 italic">{t("ownerHasAllAccess")}</div>}
                  </div>
                  {!member.isCurrentUser && member.role !== "OWNER" && (
                    <button onClick={() => handleRemove(member.id, member.user.name ?? member.user.email)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0" title="Remove member"><Trash2 size={13} /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {atLimit ? (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 flex items-center justify-between">
          <span><strong>{t("seatLimitReached")}</strong> {t("seatLimitMsg")}</span>
          <a href="/pricing" className="ml-4 shrink-0 bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">{t("upgradeBtn")}</a>
        </div>
      ) : (
        <button onClick={() => setShowInvite((v) => !v)} className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2.5 rounded-xl transition-colors border border-brand-100">
          <UserPlus size={15} />{showInvite ? t("cancel") : t("addTeamMember")}
        </button>
      )}

      {showInvite && !atLimit && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">{t("inviteTeamMember")}</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("fieldFullName")}</label>
                <input value={inviteForm.name} onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))} required placeholder={t("placeholderFullName")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("fieldEmail")}</label>
                <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} required placeholder={t("placeholderEmail")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("fieldTempPassword")}</label>
                <input type="password" value={inviteForm.password} onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))} required minLength={8} placeholder={t("placeholderMinChars")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("fieldRole")}</label>
                <select value={inviteForm.role} onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as "ADMIN" | "VIEWER" }))} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="VIEWER">{t("optionViewerReadOnly")}</option>
                  <option value="ADMIN">{t("optionAdminCanManage")}</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={inviteLoading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
              {inviteLoading ? t("addingMember") : t("addTeamMember")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
