"use client";

import { useState } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { useT } from "@/lib/i18n";
import {
  CheckCircle2, AlertCircle, Eye, EyeOff, User, Lock, CreditCard, ChevronUp,
} from "lucide-react";

function fetcher(url: string) {
  return api.get(url).then((r) => r.data);
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--color-rule)", background: "white" }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-rule)", background: "var(--color-paper-2)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--color-paper)", border: "1px solid var(--color-rule)" }}
          >
            <Icon size={14} style={{ color: "var(--color-accent)" }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>{title}</h2>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ── Alert ──────────────────────────────────────────────────────────────────────
function Alert({ success, message }: { success: boolean; message: string }) {
  return (
    <div
      className={`flex items-start gap-2 p-3 rounded-lg text-sm mb-4 ${
        success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
      }`}
    >
      {success ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
      {message}
    </div>
  );
}

// ── Profile section ────────────────────────────────────────────────────────────
function ProfileSection() {
  const t = useT();
  const { data: meData, mutate } = useSWR("/api/auth/me", fetcher);
  const currentName: string = meData?.data?.user?.name ?? "";
  const email: string = meData?.data?.user?.email ?? "";

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ success: boolean; message: string } | null>(null);

  // Init name from data once loaded
  const displayName = name || currentName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) return;
    setLoading(true);
    setAlert(null);
    try {
      await api.patch("/api/auth/profile", { name: name.trim() });
      await mutate();
      setAlert({ success: true, message: t("profileUpdated") });
      setName("");
    } catch (err: any) {
      setAlert({ success: false, message: err.response?.data?.error ?? "Update failed" });
    } finally { setLoading(false); }
  }

  return (
    <Section icon={User} title={t("profileSection")} subtitle={t("profileSubtitle")}>
      {alert && <Alert {...alert} />}
      <div className="mb-3">
        <span className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>Email</span>
        <p className="text-sm mt-0.5 font-mono" style={{ color: "var(--color-neutral)" }}>{email || "—"}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>
            {t("fieldName")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={currentName || "Your name"}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--color-rule)" }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !name.trim() || name.trim() === currentName}
          className="btn-accent px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? t("updatingProfile") : t("updateProfile")}
        </button>
      </form>
    </Section>
  );
}

// ── Change password section ────────────────────────────────────────────────────
function ChangePasswordSection() {
  const t = useT();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ success: boolean; message: string } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setAlert({ success: false, message: t("passwordsDoNotMatch") });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      await api.post("/api/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setAlert({ success: true, message: t("passwordChanged") });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setAlert({ success: false, message: err.response?.data?.error ?? "Failed to change password" });
    } finally { setLoading(false); }
  }

  const fields = [
    { name: "currentPassword", labelKey: "fieldCurrentPassword", show: showCurrent, toggle: () => setShowCurrent((v) => !v) },
    { name: "newPassword",     labelKey: "fieldNewPassword",     show: showNew,     toggle: () => setShowNew((v) => !v) },
    { name: "confirmPassword", labelKey: "fieldConfirmPassword", show: showNew,     toggle: () => setShowNew((v) => !v) },
  ];

  return (
    <Section icon={Lock} title={t("changePasswordSection")} subtitle="Choose a strong, unique password">
      {alert && <Alert {...alert} />}
      <form onSubmit={handleSubmit} className="space-y-3">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>
              {t(f.labelKey)}
            </label>
            <div className="relative">
              <input
                type={f.show ? "text" : "password"}
                name={f.name}
                value={form[f.name as keyof typeof form]}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 pr-9 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: "var(--color-rule)" }}
              />
              <button
                type="button"
                onClick={f.toggle}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {f.show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        ))}
        <button
          type="submit"
          disabled={loading || !form.currentPassword || !form.newPassword || !form.confirmPassword}
          className="btn-accent px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? t("changingPassword") : t("changePassword")}
        </button>
      </form>
    </Section>
  );
}

// ── Plan section ───────────────────────────────────────────────────────────────
function PlanSection() {
  const t = useT();
  const { data: subRaw } = useSWR("/api/subscription", fetcher);
  const sub = subRaw?.data;

  const TIER_COLORS: Record<string, string> = {
    FREE:     "bg-gray-100 text-gray-700",
    STANDARD: "bg-blue-100 text-blue-700",
    PREMIUM:  "bg-purple-100 text-purple-700",
    PLATINUM: "bg-yellow-100 text-yellow-700",
  };

  const TIER_LABELS: Record<string, string> = {
    FREE: "planFree", STANDARD: "planStandard", PREMIUM: "planPremium", PLATINUM: "planPlatinum",
  };

  if (!sub) return (
    <Section icon={CreditCard} title={t("planSection")} subtitle={t("planSectionSubtitle")}>
      <p className="text-sm" style={{ color: "var(--color-muted)" }}>{t("loading")}</p>
    </Section>
  );

  const waMax = sub.limits?.maxWaAccounts === Infinity ? "∞" : String(sub.limits?.maxWaAccounts ?? "?");
  const teamMax = sub.limits?.maxTeamMembers === Infinity ? "∞" : String(sub.limits?.maxTeamMembers ?? "?");
  const waUsed = sub.usage?.waAccounts ?? 0;
  const teamUsed = sub.usage?.teamMembers ?? 0;

  const waPercent = sub.limits?.maxWaAccounts && sub.limits.maxWaAccounts !== Infinity
    ? Math.min(100, Math.round((waUsed / sub.limits.maxWaAccounts) * 100)) : 0;
  const teamPercent = sub.limits?.maxTeamMembers && sub.limits.maxTeamMembers !== Infinity
    ? Math.min(100, Math.round((teamUsed / sub.limits.maxTeamMembers) * 100)) : 0;

  return (
    <Section icon={CreditCard} title={t("planSection")} subtitle={t("planSectionSubtitle")}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TIER_COLORS[sub.tier] ?? TIER_COLORS.FREE}`}>
            {t(TIER_LABELS[sub.tier] ?? "planFree")}
          </span>
          {sub.expiresAt && (
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>
              Expires {new Date(sub.expiresAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <a
          href="/dashboard/billing"
          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg btn-ghost"
        >
          <ChevronUp size={12} /> {t("upgradePlan")}
        </a>
      </div>

      <div className="space-y-4">
        {/* WA accounts usage */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: "var(--color-ink)" }}>
              {t("waAccountsUsage", waUsed, waMax)}
            </span>
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>{waPercent}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-rule)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${waPercent}%`,
                background: waPercent >= 90 ? "oklch(50% 0.20 29)" : waPercent >= 70 ? "oklch(65% 0.18 80)" : "var(--color-accent)",
              }}
            />
          </div>
        </div>

        {/* Team members usage */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: "var(--color-ink)" }}>
              {t("teamMembersUsage", teamUsed, teamMax)}
            </span>
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>{teamPercent}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-rule)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${teamPercent}%`,
                background: teamPercent >= 90 ? "oklch(50% 0.20 29)" : teamPercent >= 70 ? "oklch(65% 0.18 80)" : "var(--color-accent)",
              }}
            />
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const t = useT();

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-ink)" }}>{t("settingsTitle")}</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>{t("settingsSubtitle")}</p>
      </div>
      <ProfileSection />
      <ChangePasswordSection />
      <PlanSection />
    </div>
  );
}
