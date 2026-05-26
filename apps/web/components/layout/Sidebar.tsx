"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import api from "@/lib/api";
import clsx from "clsx";
import { useT } from "@/lib/i18n";
import {
  LayoutDashboard,
  Settings,
  Webhook,
  Bell,
  Phone,
  Users,
  MessageCircle,
  FileText,
  Send,
  Wallet,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

// ── Plan badge ────────────────────────────────────────────────────────────────
function PlanBadge() {
  const t = useT();
  const { data } = useSWR("/api/subscription", (url) =>
    api.get(url).then((r) => r.data.data)
  );
  const tier = data?.tier ?? "FREE";
  const colors: Record<string, string> = {
    FREE: "text-gray-500",
    STANDARD: "text-blue-600 font-semibold",
    PREMIUM: "text-purple-600 font-semibold",
    PLATINUM: "text-yellow-600 font-semibold",
  };
  const labelKeys: Record<string, string> = {
    FREE: "planFree",
    STANDARD: "planStandard",
    PREMIUM: "planPremium",
    PLATINUM: "planPlatinum",
  };
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${colors[tier]}`}>
        {t(labelKeys[tier] ?? "planFree")}
      </span>
      <span className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>
        {t("upgradeArrow")}
      </span>
    </div>
  );
}

// ── Nav item ─────────────────────────────────────────────────────────────────
function NavItem({
  href,
  icon: Icon,
  label,
  indent = false,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  indent?: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
        indent ? "px-3 py-1.5 ml-4" : "px-3 py-2",
        isActive
          ? "text-[var(--color-accent)]"
          : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
      )}
      style={isActive ? { background: "oklch(97% 0.012 143)" } : {}}
    >
      <Icon size={15} className="shrink-0" />
      {label}
    </Link>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
      {children}
    </p>
  );
}

// ── WhatsApp channel icon ────────────────────────────────────────────────────
function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
    </svg>
  );
}

// ── Instagram icon ───────────────────────────────────────────────────────────
function InstagramIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4c0 3.2-2.6 5.8-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2zm-.2 2C5.6 4 4 5.6 4 7.6v8.8c0 2 1.6 3.6 3.6 3.6h8.8c2 0 3.6-1.6 3.6-3.6V7.6C20 5.6 18.4 4 16.4 4H7.6zM17.25 5.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10A5 5 0 0 1 12 7zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    </svg>
  );
}

// ── Messenger icon ───────────────────────────────────────────────────────────
function MessengerIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.908 1.377 5.504 3.54 7.23V22l3.333-1.833A11.3 11.3 0 0 0 12 20.486c5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm1.071 12.45l-2.55-2.716-4.977 2.716 5.477-5.813 2.613 2.716 4.914-2.716-5.477 5.813z" />
    </svg>
  );
}

// ── Coming-soon channel row ───────────────────────────────────────────────────
function ComingSoonChannel({
  icon: Icon,
  label,
  soonLabel,
}: {
  icon: React.ElementType;
  label: string;
  soonLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-50 cursor-default select-none">
      <Icon size={15} className="shrink-0 text-gray-400" />
      <span className="text-sm font-medium text-gray-400 flex-1">{label}</span>
      <span
        className="text-xs px-1.5 py-0.5 rounded-full font-medium"
        style={{
          background: "var(--color-paper-2)",
          color: "var(--color-muted)",
          fontSize: "10px",
          border: "1px solid var(--color-rule)",
        }}
      >
        {soonLabel}
      </span>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar() {
  const t = useT();
  const pathname = usePathname();

  const { data: meData } = useSWR("/api/auth/me", (url: string) =>
    api.get(url).then((r) => r.data)
  );
  const userRole: string = meData?.data?.user?.role ?? "";
  const userEmail: string = meData?.data?.user?.email ?? "";
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isManagerEmail = userEmail === "manager@whatsapi.buzz";

  // WhatsApp sub-items
  const waItems = [
    { labelKey: "navChat",      href: "/dashboard/chat",          icon: MessageCircle },
    { labelKey: "navTemplates", href: "/dashboard/templates",     icon: FileText },
    { labelKey: "navBulkSend",  href: "/dashboard/bulk-send",     icon: Send },
  ];

  // Workspace items
  const workspaceItems = [
    { labelKey: "navOverview",     href: "/dashboard",                 icon: LayoutDashboard },
    { labelKey: "navPhoneNumbers", href: "/dashboard/phone-numbers",   icon: Phone },
    { labelKey: "navTeam",         href: "/dashboard/team",            icon: Users },
    { labelKey: "navBilling",      href: "/dashboard/billing",         icon: Wallet },
    { labelKey: "navSettings",     href: "/dashboard/settings",        icon: Settings },
  ];

  // Developer items
  const developerItems = [
    { labelKey: "navWebhooks", href: "/dashboard/webhooks", icon: Webhook },
    { labelKey: "navEvents",   href: "/dashboard/events",   icon: Bell },
  ];

  // Detect if any WA page is active
  const waActive = waItems.some((item) => pathname.startsWith(item.href));

  return (
    <aside
      className="flex flex-col shrink-0 bg-white border-r"
      style={{
        width: "var(--sidebar-width)",
        borderColor: "var(--color-rule)",
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div
        className="px-5 py-5 border-b"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--color-accent)" }}
          >
            <WhatsAppIcon size={14} />
          </div>
          <span
            className="font-wordmark text-[15px] font-semibold tracking-tight"
            style={{ color: "var(--color-ink)" }}
          >
            {t("waPlatform")}
          </span>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">

        {/* CHANNELS */}
        <div>
          <SidebarLabel>{t("navChannels")}</SidebarLabel>

          {/* WhatsApp — active channel */}
          <div className="space-y-0.5">
            {/* Channel header */}
            <div
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg",
                waActive
                  ? "text-[var(--color-accent)]"
                  : "text-gray-600"
              )}
              style={waActive ? { background: "oklch(95% 0.015 143)" } : {}}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                style={{
                  background: waActive
                    ? "var(--color-accent)"
                    : "oklch(85% 0.010 143)",
                }}
              >
                <WhatsAppIcon size={11} />
              </div>
              <span
                className="text-sm font-semibold flex-1"
                style={{
                  color: waActive ? "var(--color-accent)" : "var(--color-ink)",
                }}
              >
                {t("navWhatsApp")}
              </span>
              <ChevronDown
                size={13}
                className={clsx(
                  "shrink-0 transition-transform",
                  waActive ? "rotate-0" : "-rotate-90"
                )}
                style={{ color: "var(--color-muted)" }}
              />
            </div>

            {/* WA sub-items — always visible (only channel for now) */}
            <div className="space-y-0.5 pt-0.5">
              {waItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={t(item.labelKey)}
                  indent
                />
              ))}
            </div>
          </div>

          {/* Instagram — coming soon */}
          <div className="mt-1">
            <ComingSoonChannel
              icon={InstagramIcon}
              label={t("navInstagram")}
              soonLabel={t("navComingSoon")}
            />
          </div>

          {/* Messenger — coming soon */}
          <ComingSoonChannel
            icon={MessengerIcon}
            label={t("navMessenger")}
            soonLabel={t("navComingSoon")}
          />
        </div>

        {/* WORKSPACE */}
        <div>
          <SidebarLabel>{t("navWorkspace")}</SidebarLabel>
          <div className="space-y-0.5">
            {workspaceItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={t(item.labelKey)}
              />
            ))}
          </div>
        </div>

        {/* DEVELOPER */}
        <div>
          <SidebarLabel>{t("navDeveloper")}</SidebarLabel>
          <div className="space-y-0.5">
            {developerItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={t(item.labelKey)}
              />
            ))}
          </div>
        </div>

        {/* PLATFORM — super admin only */}
        {isSuperAdmin && (
          <div>
            <SidebarLabel>{t("navPlatform")}</SidebarLabel>
            <div className="space-y-0.5">
              {!isManagerEmail && (
                <Link
                  href="/admin"
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname.startsWith("/admin")
                      ? "bg-red-50 text-red-700"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  )}
                >
                  <ShieldCheck size={15} className="shrink-0" />
                  {t("navAdminPanel")}
                </Link>
              )}
              {isManagerEmail && (
                <Link
                  href="/manager"
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname.startsWith("/manager")
                      ? "bg-orange-50 text-orange-700"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  )}
                >
                  <ShieldCheck size={15} className="shrink-0" />
                  {t("navManagerPanel")}
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Plan badge ───────────────────────────────────────────────────── */}
      <div className="px-3 pb-4">
        <Link
          href="/dashboard/billing"
          className="block rounded-xl px-3 py-2.5 transition-colors"
          style={{
            background: "var(--color-paper-2)",
            border: "1px solid var(--color-rule)",
          }}
        >
          <div
            className="text-xs mb-0.5"
            style={{ color: "var(--color-muted)" }}
          >
            {t("currentPlan")}
          </div>
          <PlanBadge />
        </Link>
      </div>
    </aside>
  );
}
