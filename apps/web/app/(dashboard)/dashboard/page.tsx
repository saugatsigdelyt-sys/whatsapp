"use client";

import useSWR from "swr";
import api from "@/lib/api";
import { MessageSquare, ArrowDownLeft, ArrowUpRight, Calendar } from "lucide-react";

function fetcher(url: string) {
  return api.get(url).then((r) => r.data.data);
}

export default function DashboardPage() {
  const { data: stats } = useSWR("/api/messages/summary/stats", fetcher);
  const { data: cred } = useSWR("/api/accounts", fetcher);

  const cards = [
    { label: "Total Messages", value: stats?.total ?? "—", icon: MessageSquare, color: "bg-blue-50 text-blue-600" },
    { label: "Inbound", value: stats?.inbound ?? "—", icon: ArrowDownLeft, color: "bg-green-50 text-green-600" },
    { label: "Outbound", value: stats?.outbound ?? "—", icon: ArrowUpRight, color: "bg-purple-50 text-purple-600" },
    { label: "Today", value: stats?.today ?? "—", icon: Calendar, color: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your WhatsApp Business at a glance</p>
      </div>

      {cred === null && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Setup required:</strong> Go to{" "}
          <a href="/dashboard/settings" className="underline font-medium">Settings</a>{" "}
          to import your WhatsApp Cloud API credentials.
        </div>
      )}

      {cred && !cred.webhookRegistered && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong>Almost there:</strong> Go to{" "}
          <a href="/dashboard/webhooks" className="underline font-medium">Webhooks</a>{" "}
          to register your webhook with Meta.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className={`inline-flex p-2 rounded-lg ${card.color} mb-3`}>
                <Icon size={16} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
