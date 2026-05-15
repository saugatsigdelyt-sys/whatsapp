"use client";

import { useState } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { Bell } from "lucide-react";

function fetcher(url: string) {
  return api.get(url).then((r) => r.data);
}

const FIELD_COLORS: Record<string, string> = {
  ACCOUNT_ALERTS: "bg-red-50 text-red-700",
  ACCOUNT_REVIEW_UPDATE: "bg-orange-50 text-orange-700",
  ACCOUNT_UPDATE: "bg-blue-50 text-blue-700",
  BUSINESS_CAPACITY_UPDATE: "bg-cyan-50 text-cyan-700",
  MESSAGE_TEMPLATE_QUALITY_UPDATE: "bg-yellow-50 text-yellow-700",
  MESSAGE_TEMPLATE_STATUS_UPDATE: "bg-yellow-50 text-yellow-700",
  PHONE_NUMBER_NAME_UPDATE: "bg-indigo-50 text-indigo-700",
  PHONE_NUMBER_QUALITY_UPDATE: "bg-purple-50 text-purple-700",
  SECURITY: "bg-red-50 text-red-700",
  TEMPLATE_CATEGORY_UPDATE: "bg-pink-50 text-pink-700",
  MESSAGES: "bg-green-50 text-green-700",
};

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSWR(`/api/webhooks/events?page=${page}`, fetcher, { refreshInterval: 15000 });
  const events = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Bell size={20} className="text-gray-400" />
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Account Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">Non-message webhook events from Meta</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No events yet. Register your webhook to start receiving account events.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {events.map((event: any) => (
              <div key={event.id} className="px-4 py-3.5">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${FIELD_COLORS[event.field] ?? "bg-gray-100 text-gray-600"}`}>
                    {event.field.toLowerCase().replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(event.createdAt).toLocaleString()}</span>
                </div>
                <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 overflow-auto max-h-32">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {(data?.total ?? 0) > 30 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {Math.ceil((data?.total ?? 0) / 30)}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40">Previous</button>
            <button disabled={!data?.hasMore} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
