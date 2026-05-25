"use client";

import useSWR from "swr";
import api from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Phone } from "lucide-react";

function fetcher(url: string) {
  return api.get(url).then((r) => r.data.data);
}

const QUALITY_COLORS: Record<string, string> = {
  GREEN: "bg-green-100 text-green-700",
  YELLOW: "bg-yellow-100 text-yellow-700",
  RED: "bg-red-100 text-red-700",
};

export default function PhoneNumbersPage() {
  const t = useT();
  const { data: phones, isLoading } = useSWR("/api/accounts/phone-numbers/all", fetcher);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Phone size={20} className="text-gray-400" />
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t("phoneNumbersTitle")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("phoneNumbersSubtitle")}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">{t("loadingPhoneNumbers")}</div>
        ) : !phones?.length ? (
          <div className="p-8 text-center text-sm text-gray-400">{t("noPhoneNumbers")}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("colPhone")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("colVerifiedName")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("colQuality")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("colStatus")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("colPhoneNumberId")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {phones.map((phone: any) => (
                <tr key={phone.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{phone.displayPhone}</td>
                  <td className="px-4 py-3 text-gray-600">{phone.verifiedName ?? "—"}</td>
                  <td className="px-4 py-3">
                    {phone.qualityRating ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${QUALITY_COLORS[phone.qualityRating] ?? "bg-gray-100 text-gray-600"}`}>
                        {phone.qualityRating}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${phone.status === "CONNECTED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {phone.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{phone.phoneNumberId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
