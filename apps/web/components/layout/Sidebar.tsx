"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import api from "@/lib/api";
import clsx from "clsx";
import {
  LayoutDashboard, MessageSquare, Settings, Webhook, Bell,
  Phone, Users, MessageCircle, FileText, Send,
} from "lucide-react";

function PlanBadge() {
  const { data } = useSWR("/api/subscription", (url) => api.get(url).then((r) => r.data.data));
  const tier = data?.tier ?? "FREE";
  const colors: Record<string, string> = {
    FREE: "text-gray-600", STANDARD: "text-blue-600 font-semibold",
    PREMIUM: "text-purple-600 font-semibold", PLATINUM: "text-yellow-600 font-semibold",
  };
  const labels: Record<string, string> = { FREE: "Free", STANDARD: "Standard", PREMIUM: "Premium", PLATINUM: "Platinum" };
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${colors[tier]}`}>{labels[tier] ?? tier}</span>
      <span className="text-xs text-brand-600 font-medium">Upgrade →</span>
    </div>
  );
}

const navGroups = [
  {
    label: "Inbox",
    items: [
      { label: "Chat",          href: "/dashboard/chat",          icon: MessageCircle },
      { label: "Messages",      href: "/dashboard/messages",      icon: MessageSquare },
    ],
  },
  {
    label: "Campaigns",
    items: [
      { label: "Templates",     href: "/dashboard/templates",     icon: FileText },
      { label: "Bulk Send",     href: "/dashboard/bulk-send",     icon: Send },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Overview",      href: "/dashboard",               icon: LayoutDashboard },
      { label: "Phone Numbers", href: "/dashboard/phone-numbers", icon: Phone },
      { label: "Webhooks",      href: "/dashboard/webhooks",      icon: Webhook },
      { label: "Events",        href: "/dashboard/events",        icon: Bell },
      { label: "Team",          href: "/dashboard/team",          icon: Users },
      { label: "Settings",      href: "/dashboard/settings",      icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="white" className="w-4.5 h-4.5">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm">WA Platform</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{group.label}</p>
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
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-4">
        <Link
          href="/pricing"
          className="block bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 transition-colors"
        >
          <div className="text-xs text-gray-400 mb-0.5">Current plan</div>
          <PlanBadge />
        </Link>
      </div>
    </aside>
  );
}
