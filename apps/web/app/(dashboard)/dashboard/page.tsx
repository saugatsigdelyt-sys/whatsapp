"use client";

import useSWR from "swr";
import Link from "next/link";
import api from "@/lib/api";
import { useT } from "@/lib/i18n";
import {
  MessageSquare, ArrowDownLeft, ArrowUpRight, Calendar,
  MessageCircle, Users, Wallet, Phone, AlertTriangle,
} from "lucide-react";

function fetcher(url: string) {
  return api.get(url).then((r) => r.data.data);
}

interface Stats {
  total: number; inbound: number; outbound: number; today: number;
  conversations: number; teamMembers: number; balance: number;
  phones: { total: number; healthy: number; needAttention: number };
}

export default function DashboardPage() {
  const t = useT();
  const { data: stats } = useSWR<Stats>("/api/messages/summary/stats", fetcher, { refreshInterval: 30000 });
  const { data: cred } = useSWR("/api/accounts", fetcher);

  const v = (val: number | undefined, prefix = "", suffix = "") =>
    val === undefined ? "—" : `${prefix}${val.toLocaleString()}${suffix}`;

  // Row 1 — messaging
  const msgCards = [
    { labelKey: "statTotalMessages", value: v(stats?.total),    icon: MessageSquare,  color: "var(--color-accent)",           bg: "oklch(94% 0.025 143)" },
    { labelKey: "statInbound",       value: v(stats?.inbound),  icon: ArrowDownLeft,  color: "oklch(46% 0.17 160)",           bg: "oklch(94% 0.025 160)" },
    { labelKey: "statOutbound",      value: v(stats?.outbound), icon: ArrowUpRight,   color: "oklch(50% 0.18 280)",           bg: "oklch(94% 0.025 280)" },
    { labelKey: "statToday",         value: v(stats?.today),    icon: Calendar,       color: "oklch(55% 0.18 60)",            bg: "oklch(95% 0.04 60)"   },
  ];

  // Row 2 — account
  const accountCards = [
    { labelKey: "statConversations", value: v(stats?.conversations),                        icon: MessageCircle,   color: "oklch(46% 0.17 210)",           bg: "oklch(94% 0.025 210)" },
    { labelKey: "statTeamMembers",   value: v(stats?.teamMembers),                          icon: Users,           color: "oklch(46% 0.17 320)",           bg: "oklch(94% 0.025 320)" },
    { labelKey: "statBalance",       value: stats?.balance !== undefined ? `$${stats.balance.toFixed(2)}` : "—", icon: Wallet, color: "oklch(50% 0.18 140)", bg: "oklch(94% 0.025 140)" },
    { labelKey: "statPhonesHealthy", value: v(stats?.phones?.healthy),                      icon: Phone,           color: "oklch(46% 0.17 160)",           bg: "oklch(94% 0.025 160)" },
  ];

  const needAttention = stats?.phones?.needAttention ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-ink)" }}>{t("overviewTitle")}</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>{t("overviewSubtitle")}</p>
      </div>

      {/* Setup banners */}
      {cred === null && (
        <div className="rounded-xl p-4 text-sm border border-amber-200 bg-amber-50 text-amber-800">
          <strong>{t("setupRequired")}</strong>{" "}
          <Link href="/dashboard/phone-numbers" className="underline font-medium">{t("navPhoneNumbers")}</Link>{" "}
          {t("setupRequiredMsg", "")}
        </div>
      )}
      {needAttention > 0 && (
        <Link
          href="/dashboard/phone-numbers"
          className="flex items-center gap-3 rounded-xl p-4 text-sm border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 transition-colors"
        >
          <AlertTriangle size={15} className="shrink-0" />
          <span>
            <strong>{needAttention} phone number{needAttention > 1 ? "s" : ""} need attention.</strong>{" "}
            Check Phone Numbers for webhook errors or account issues.
          </span>
        </Link>
      )}

      {/* Row 1 — messages */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted)" }}>
          Messages
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {msgCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.labelKey}
                className="rounded-xl border p-4"
                style={{ background: "white", borderColor: "var(--color-rule)" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: card.bg }}
                >
                  <Icon size={15} style={{ color: card.color }} />
                </div>
                <div className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>{card.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{t(card.labelKey)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 2 — account */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted)" }}>
          Account
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {accountCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.labelKey}
                className="rounded-xl border p-4"
                style={{ background: "white", borderColor: "var(--color-rule)" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: card.bg }}
                >
                  <Icon size={15} style={{ color: card.color }} />
                </div>
                <div className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>{card.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{t(card.labelKey)}</div>
              </div>
            );
          })}
          {/* Need attention card — only when there are issues */}
          {needAttention > 0 && (
            <Link
              href="/dashboard/phone-numbers"
              className="rounded-xl border p-4 transition-colors hover:bg-orange-50"
              style={{ background: "white", borderColor: "oklch(80% 0.10 50)" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: "oklch(95% 0.06 50)" }}
              >
                <AlertTriangle size={15} style={{ color: "oklch(55% 0.18 50)" }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: "oklch(45% 0.20 50)" }}>{needAttention}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{t("statPhonesIssue")}</div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
