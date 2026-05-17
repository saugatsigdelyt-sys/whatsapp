"use client";

import { useState } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { X, Info, AlertTriangle, CheckCircle, AlertOctagon } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  type: string;
};

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />,
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    icon: <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" />,
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    icon: <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />,
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    icon: <AlertOctagon size={16} className="text-red-500 shrink-0 mt-0.5" />,
  },
};

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const { data } = useSWR(
    "/api/announcements/active",
    (url: string) => api.get(url).then((r) => r.data)
  );

  const ann: Announcement | null = data?.data ?? null;
  if (!ann || dismissed === ann.id) return null;

  const style = TYPE_STYLES[ann.type] ?? TYPE_STYLES.info;

  return (
    <div className={`${style.bg} ${style.border} border-b px-4 py-2.5`}>
      <div className="max-w-7xl mx-auto flex items-start gap-2">
        {style.icon}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-semibold ${style.text}`}>{ann.title}</span>
          {" "}
          <span className={`text-sm ${style.text} opacity-90`}>{ann.body}</span>
        </div>
        <button
          onClick={() => setDismissed(ann.id)}
          className={`${style.text} opacity-60 hover:opacity-100 shrink-0 ml-2`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
