"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import api from "@/lib/api";
import clsx from "clsx";
import { useT } from "@/lib/i18n";
import {
  LayoutDashboard, MessageSquare, Settings, Webhook, Bell,
  Phone, Users, MessageCircle, FileText, Send, Wallet, ShieldCheck,
} from "lucide-react";

function PlanBadge() {
  const t = useT();
  const { data } = useSWR("/api/subscription", (url) => api.get(url).then((r) => r.data.data));
  const tier = data?.tier ?? "FREE";
  const colors: Record<string, string> = {
    FREE: "text-gray-600", STANDARD: "text-blue-600 font-semibold",
    PREMIUM: "text-purple-600 font-semibold", PLATINUM: "text-yellow-600 font-semibold",
  };
  const labelKeys: Record<string, string> = {
    FREE: "planFree", STANDARD: "planStandard", PREMIUM: "planPremium", PLATINUM: "planPlatinum",
  };
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${colors[tier]}`}>{t(labelKeys[tier] ?? "planFree")}</span>
      <span className="text-xs text-brand-600 font-medium">{t("upgradeArrow")}</span>
    </div>
  );
}

export function Sidebar() {
  const t = useT();
  const pathname = usePathname();
  const { data: meData } = useSWR("/api/auth/me", (url: string) => api.get(url).then((r) => r.data));
  const userRole: string = meData?.data?.user?.role ?? "";
  const userEmail: string = meData?.data?.user?.email ?? "";
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isManagerEmail = userEmail === "manager@whatsapi.buzz";

  const navGroups = [
    {
      labelKey: "navInbox",
      items: [
        { labelKey: "navChat",     href: "/dashboard/chat",          icon: MessageCircle },
        { labelKey: "navMessages", href: "/dashboard/messages",      icon: MessageSquare },
      ],
    },
    {
      labelKey: "navCampaigns",
      items: [
        { labelKey: "navTemplates", href: "/dashboard/templates",    icon: FileText },
        { labelKey: "navBulkSend",  href: "/dashboard/bulk-send",    icon: Send },
      ],
    },
    {
      labelKey: "navAccount",
      items: [
        { labelKey: "navOverview",      href: "/dashboard",               icon: LayoutDashboard },
        { labelKey: "navPhoneNumbers",  href: "/dashboard/phone-numbers", icon: Phone },
        { labelKey: "navWebhooks",      href: "/dashboard/webhooks",      icon: Webhook },
        { labelKey: "navEvents",        href: "/dashboard/events",        icon: Bell },
        { labelKey: "navTeam",          href: "/dashboard/team",          icon: Users },
        { labelKey: "navBilling",       href: "/dashboard/billing",       icon: Wallet },
        { labelKey: "navSettings",      href: "/dashboard/settings",      icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="white" className="w-4.5 h-4.5">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm">{t("waPlatform")}</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.labelKey}>
            <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t(group.labelKey)}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {isSuperAdmin && (
          <div>
            <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t("navPlatform")}
            </p>
            <div className="space-y-0.5">
              {!isManagerEmail && (
                <Link
                  href="/admin"
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname.startsWith("/admin") ? "bg-red-50 text-red-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <ShieldCheck size={16} className="shrink-0" />
                  {t("navAdminPanel")}
                </Link>
              )}
              {isManagerEmail && (
                <Link
                  href="/manager"
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname.startsWith("/manager") ? "bg-orange-50 text-orange-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <ShieldCheck size={16} className="shrink-0" />
                  {t("navManagerPanel")}
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <div className="px-3 pb-4">
        <Link
          href="/dashboard/billing"
          className="block bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 transition-colors"
        >
          <div className="text-xs text-gray-400 mb-0.5">{t("currentPlan")}</div>
          <PlanBadge />
        </Link>
      </div>
    </aside>
  );
}
