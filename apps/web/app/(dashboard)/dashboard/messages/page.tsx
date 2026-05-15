"use client";

import { useState } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { ArrowDownLeft, ArrowUpRight, Search } from "lucide-react";

function fetcher(url: string) {
  return api.get(url).then((r) => r.data);
}

export default function MessagesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR(
    `/api/messages?page=${page}&search=${search}`,
    fetcher,
    { refreshInterval: 10000 }
  );

  const messages = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total messages</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No messages yet. They will appear here once your webhook is set up.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Direction</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">From</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">To</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Message</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {messages.map((msg: any) => (
                <tr key={msg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {msg.direction === "INBOUND" ? (
                      <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                        <ArrowDownLeft size={11} /> In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-medium">
                        <ArrowUpRight size={11} /> Out
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{msg.fromPhone}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{msg.toPhone}</td>
                  <td className="px-4 py-3 text-gray-800 max-w-xs truncate">
                    {msg.textBody ?? msg.mediaCaption ?? <span className="text-gray-400 italic">{msg.type.toLowerCase()}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={msg.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(msg.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 50 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Previous</button>
            <button disabled={!data?.hasMore} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    RECEIVED: "bg-green-50 text-green-700",
    SENT: "bg-blue-50 text-blue-700",
    DELIVERED: "bg-indigo-50 text-indigo-700",
    READ: "bg-purple-50 text-purple-700",
    FAILED: "bg-red-50 text-red-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}>{status}</span>;
}
