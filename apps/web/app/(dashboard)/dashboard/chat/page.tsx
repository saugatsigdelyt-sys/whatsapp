"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Send, Phone, MessageCircle, Search, CheckCheck, Check } from "lucide-react";

function fetcher(url: string) { return api.get(url).then((r) => r.data); }

interface WaCred { id: string; name: string; displayPhone: string | null; phoneNumberId: string; }
interface Conversation {
  id: string; waCredentialId: string; contactPhone: string; contactName: string | null;
  lastMessageAt: string; unreadCount: number;
  waCredential: WaCred;
  messages: Array<{ textBody: string | null; direction: string; timestamp: string; type: string }>;
}
interface Message {
  id: string; direction: "INBOUND" | "OUTBOUND"; textBody: string | null;
  type: string; status: string; timestamp: string;
}

function timeAgo(iso: string) {
  const d = new Date(iso); const now = Date.now(); const diff = now - d.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const t = useT();
  const [selectedCredId, setSelectedCredId] = useState<string | null>(null);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: accountsData } = useSWR("/api/accounts", fetcher, { refreshInterval: 5000 });
  const accounts: WaCred[] = accountsData?.data ?? [];

  useEffect(() => {
    if (accounts.length === 0) return;
    // Auto-select first account on first load
    if (!selectedCredId) {
      setSelectedCredId(accounts[0].id);
      api.post("/api/conversations/backfill").catch(() => {});
      return;
    }
    // If the selected account was deleted or transferred away, reset to first available
    if (!accounts.find((a) => a.id === selectedCredId)) {
      setSelectedCredId(accounts[0].id);
      setSelectedConvId(null);
    }
  }, [accounts, selectedCredId]);

  const convUrl = selectedCredId ? `/api/conversations?credentialId=${selectedCredId}` : null;
  const { data: convsData, mutate: mutateConvs } = useSWR(convUrl, fetcher, {
    refreshInterval: 1500,
    dedupingInterval: 500,
    revalidateOnFocus: true,
  });
  const conversations: Conversation[] = convsData?.data ?? [];

  const filtered = conversations.filter((c) =>
    !search || c.contactPhone.includes(search) || (c.contactName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const msgUrl = selectedConvId ? `/api/conversations/${selectedConvId}/messages` : null;
  const { data: msgsData, mutate: mutateMsgs } = useSWR(msgUrl, fetcher, {
    refreshInterval: 1500,
    dedupingInterval: 500,
    revalidateOnFocus: true,
  });
  const messages: Message[] = msgsData?.data ?? [];
  const activeConv = conversations.find((c) => c.id === selectedConvId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvId || sending) return;
    const text = replyText.trim();
    setSending(true);
    setReplyText(""); // Clear immediately so user can type next message

    // Optimistic update — show message instantly before server confirms
    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      direction: "OUTBOUND",
      textBody: text,
      type: "TEXT",
      status: "SENT",
      timestamp: new Date().toISOString(),
    };
    mutateMsgs(
      (prev: any) => ({ ...(prev ?? {}), data: [...(prev?.data ?? []), optimisticMsg] }),
      false // skip revalidation so the optimistic message stays visible immediately
    );

    try {
      await api.post(`/api/conversations/${selectedConvId}/reply`, { text });
      // Replace optimistic message with the real one from server
      mutateMsgs();
      mutateConvs();
    } catch (err: any) {
      // Roll back optimistic message on failure
      mutateMsgs();
      setReplyText(text); // Restore text so user can retry
      alert(err.response?.data?.error ?? t("failedToSend"));
    } finally { setSending(false); }
  }

  return (
    <div className="flex h-full -m-6 bg-gray-100">
      {/* Phone tabs */}
      <div className="w-16 bg-[#1a1a2e] flex flex-col items-center py-3 gap-2 shrink-0">
        {accounts.map((acc) => {
          const initials = (acc.name ?? acc.displayPhone ?? "?")[0].toUpperCase();
          const isActive = acc.id === selectedCredId;
          return (
            <button key={acc.id} onClick={() => { setSelectedCredId(acc.id); setSelectedConvId(null); }} title={acc.name}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${isActive ? "bg-brand-500 text-white shadow-lg scale-105" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>
              {initials}
            </button>
          );
        })}
        {accounts.length === 0 && (
          <div className="text-white/30 text-xs text-center px-1 mt-4">{t("noPhones")}</div>
        )}
      </div>

      {/* Conversation list */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 bg-[#f0f2f5]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-800 text-sm">
              {accounts.find((a) => a.id === selectedCredId)?.name ?? t("conversationsLabel")}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              {t("liveLabel")}
            </div>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchConversations")}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selectedCredId && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
              <Phone size={32} className="mb-2 opacity-30" />
              {t("selectPhoneAccount")}
            </div>
          )}
          {selectedCredId && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
              <MessageCircle size={32} className="mb-2 opacity-30" />
              {t("noConversationsYet")}
            </div>
          )}
          {filtered.map((conv) => {
            const last = conv.messages[0];
            const isActive = conv.id === selectedConvId;
            const preview = last?.textBody ?? (last?.type === "IMAGE" ? "📷 Image" : last?.type === "AUDIO" ? "🎵 Audio" : "—");
            return (
              <button key={conv.id} onClick={() => setSelectedConvId(conv.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 text-left transition-colors ${isActive ? "bg-[#f0f2f5]" : ""}`}>
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                  {conv.contactPhone.slice(-2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800 truncate">{conv.contactName ?? conv.contactPhone}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-1">{timeAgo(conv.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {last?.direction === "OUTBOUND" && <CheckCheck size={11} className="text-blue-500 shrink-0" />}
                    <p className="text-xs text-gray-500 truncate">{preview}</p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-auto shrink-0 w-4 h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        {!selectedConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] text-gray-400">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <MessageCircle size={36} className="text-gray-300" />
            </div>
            <p className="font-medium text-gray-600">{t("selectConversation")}</p>
            <p className="text-sm mt-1">{t("chooseFromListToChat")}</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 bg-[#f0f2f5] border-b border-gray-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-600">
                {activeConv?.contactPhone.slice(-2) ?? "?"}
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">{activeConv?.contactName ?? activeConv?.contactPhone}</div>
                <div className="text-xs text-gray-500">
                  {t("viaLabel")} {activeConv?.waCredential.name ?? activeConv?.waCredential.displayPhone}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
              style={{ background: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23d4d4d4\" fill-opacity=\"0.15\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E'), #e5ddd5" }}>
              {messages.map((msg, i) => {
                const isOut = msg.direction === "OUTBOUND";
                const showTime = i === messages.length - 1 || new Date(messages[i + 1]?.timestamp).getTime() - new Date(msg.timestamp).getTime() > 300000;
                return (
                  <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[65%] ${isOut ? "items-end" : "items-start"} flex flex-col`}>
                      <div className={`px-3 py-2 rounded-lg text-sm shadow-sm ${isOut ? "bg-[#dcf8c6] rounded-br-none" : "bg-white rounded-bl-none"}`}>
                        {msg.textBody ?? (
                          <span className="italic text-gray-400 text-xs">
                            {msg.type === "IMAGE" ? "📷 Image" : msg.type === "AUDIO" ? "🎵 Audio" : msg.type === "VIDEO" ? "🎥 Video" : msg.type === "DOCUMENT" ? "📄 Document" : `[${msg.type}]`}
                          </span>
                        )}
                        <div className={`flex items-center gap-1 mt-0.5 ${isOut ? "justify-end" : "justify-start"}`}>
                          <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
                          {isOut && (
                            msg.status === "READ" ? <CheckCheck size={11} className="text-blue-500" /> :
                            msg.status === "DELIVERED" ? <CheckCheck size={11} className="text-gray-400" /> :
                            <Check size={11} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 bg-[#f0f2f5] border-t border-gray-200">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                  placeholder={t("typeAMessage")}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  disabled={sending} />
                <button type="submit" disabled={!replyText.trim() || sending}
                  className="w-10 h-10 bg-brand-600 text-white rounded-full flex items-center justify-center hover:bg-brand-700 disabled:opacity-40 transition-colors shrink-0">
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
