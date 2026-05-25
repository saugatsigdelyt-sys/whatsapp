"use client";

import { useState } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { useT } from "@/lib/i18n";
import {
  Wallet, TrendingUp, CreditCard, ArrowDownLeft,
  CheckCircle, Clock, Copy, ExternalLink, Loader2, QrCode,
} from "lucide-react";

type Tx = { id: string; type: string; amount: number; balanceAfter: number; description: string | null; createdAt: string; };
type BalanceData = { balance: number; planExpiresAt: string | null; tier: string; transactions: Tx[]; };
type Prices = { STANDARD: number; PREMIUM: number; PLATINUM: number; minDeposit: number; };
type SavedAddress = { id: string; network: string; address: string; createdAt: string; };

const NETWORKS: { id: string; label: string; coin: string }[] = [
  { id: "TRX", label: "TRON (TRC-20)", coin: "USDT / USDC / TRX" },
  { id: "ETH", label: "Ethereum (ERC-20)", coin: "USDT / USDC / ETH" },
  { id: "BSC", label: "BNB Smart Chain (BEP-20)", coin: "USDT / USDC / BNB" },
  { id: "LTC", label: "Litecoin", coin: "LTC" },
  { id: "BTC", label: "Bitcoin", coin: "BTC" },
];

const TIER_COLORS: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700", STANDARD: "bg-blue-100 text-blue-700",
  PREMIUM: "bg-purple-100 text-purple-700", PLATINUM: "bg-yellow-100 text-yellow-700",
};

const TX_ICONS: Record<string, React.ReactNode> = {
  DEPOSIT: <ArrowDownLeft size={14} className="text-green-600" />,
  PLAN_PURCHASE: <CreditCard size={14} className="text-blue-600" />,
  ADMIN_CREDIT: <TrendingUp size={14} className="text-green-600" />,
  ADMIN_DEBIT: <TrendingUp size={14} className="text-red-600" />,
  REFUND: <ArrowDownLeft size={14} className="text-purple-600" />,
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="ml-2 text-gray-400 hover:text-gray-700 transition-colors shrink-0" title="Copy">
      {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  );
}

function QrModal({ address, network, onClose }: { address: string; network: string; onClose: () => void }) {
  const t = useT();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(address)}`;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs text-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 mb-1">{t("scanToSend")}</h3>
        <p className="text-sm text-gray-500 mb-4">{network} {t("networkLabel")}</p>
        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-center mb-4">
          <img src={qrUrl} alt="QR Code" width={220} height={220} className="rounded" />
        </div>
        <div className="bg-gray-100 rounded-lg px-3 py-2 mb-4">
          <p className="text-xs text-gray-500 mb-1 font-medium">{t("addressLabel")}</p>
          <div className="flex items-center justify-center gap-1">
            <code className="text-xs text-gray-800 font-mono break-all">{address}</code>
            <CopyButton text={address} />
          </div>
        </div>
        <button onClick={onClose} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors">
          {t("close")}
        </button>
      </div>
    </div>
  );
}

function AddressCard({ saved, networkInfo }: { saved: SavedAddress; networkInfo?: { label: string; coin: string } }) {
  const t = useT();
  const [showQr, setShowQr] = useState(false);
  const label = networkInfo?.label ?? saved.network;
  const coin = networkInfo?.coin ?? "";
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-sm font-semibold text-gray-800">{label}</span>
          {coin && <span className="ml-2 text-xs text-gray-400">{coin}</span>}
        </div>
        <button onClick={() => setShowQr(true)} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
          <QrCode size={14} /> {t("qrCode")}
        </button>
      </div>
      <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2">
        <code className="text-xs text-gray-800 font-mono break-all flex-1">{saved.address}</code>
        <CopyButton text={saved.address} />
      </div>
      <p className="text-xs text-gray-400 mt-2">{t("permanentAddressNote")}</p>
      {showQr && <QrModal address={saved.address} network={label} onClose={() => setShowQr(false)} />}
    </div>
  );
}

export default function BillingPage() {
  const t = useT();
  const { data: balData, mutate: mutateBalance } = useSWR<{ success: boolean; data: BalanceData }>(
    "/api/payments/balance", (url: string) => api.get(url).then((r) => r.data)
  );
  const { data: pricesData } = useSWR<{ success: boolean; data: Prices }>(
    "/api/payments/prices", (url: string) => api.get(url).then((r) => r.data)
  );
  const { data: addressesData, mutate: mutateAddresses } = useSWR<{ success: boolean; data: SavedAddress[] }>(
    "/api/payments/addresses", (url: string) => api.get(url).then((r) => r.data)
  );

  const balance = balData?.data ?? { balance: 0, planExpiresAt: null, tier: "FREE", transactions: [] };
  const prices = pricesData?.data ?? { STANDARD: 20, PREMIUM: 50, PLATINUM: 100, minDeposit: 5 };
  const savedAddresses: SavedAddress[] = addressesData?.data ?? [];

  const generatedNetworks = new Set(savedAddresses.map((a) => a.network));
  const availableNetworks = NETWORKS.filter((n) => !generatedNetworks.has(n.id));

  const [invoiceAmount, setInvoiceAmount] = useState(10);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [payLink, setPayLink] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState<string>("");
  const [planMsg, setPlanMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleInvoice() {
    setInvoiceLoading(true);
    setPayLink(null);
    try {
      const res = await api.post("/api/payments/invoice", { amount: invoiceAmount });
      setPayLink(res.data.data.payLink);
    } catch (err: any) {
      alert(err?.response?.data?.error ?? "Failed to create invoice");
    } finally { setInvoiceLoading(false); }
  }

  async function handleGetAddress() {
    if (!selectedNetwork) return;
    setAddrLoading(true);
    setAddrError(null);
    try {
      await api.post("/api/payments/static-address", { network: selectedNetwork });
      await mutateAddresses();
      setSelectedNetwork("");
    } catch (err: any) {
      setAddrError(err?.response?.data?.error ?? "Failed to get address");
    } finally { setAddrLoading(false); }
  }

  async function handlePlanPurchase(tier: string) {
    if (!confirm(t("purchasePlanConfirm", tier, (prices as any)[tier]))) return;
    setPlanLoading(tier);
    setPlanMsg(null);
    try {
      const res = await api.post("/api/payments/plan/purchase", { tier });
      setPlanMsg({ text: res.data.message, ok: true });
      mutateBalance();
    } catch (err: any) {
      setPlanMsg({ text: err?.response?.data?.error ?? "Purchase failed", ok: false });
    } finally { setPlanLoading(""); }
  }

  const plans = [
    {
      tier: "STANDARD", label: "Standard", price: prices.STANDARD,
      features: [t("planFeature3WA"), t("planFeature5Team"), t("planFeatureAllMsg")],
      color: "border-blue-300 bg-blue-50", btnColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      tier: "PREMIUM", label: "Premium", price: prices.PREMIUM,
      features: [t("planFeature10WA"), t("planFeature20Team"), t("planFeaturePriority")],
      color: "border-purple-300 bg-purple-50", btnColor: "bg-purple-600 hover:bg-purple-700", highlight: true,
    },
    {
      tier: "PLATINUM", label: "Platinum", price: prices.PLATINUM,
      features: [t("planFeature50WA"), t("planFeature100Team"), t("planFeatureDedicated")],
      color: "border-yellow-300 bg-yellow-50", btnColor: "bg-yellow-600 hover:bg-yellow-700",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("billingTitle")}</h1>
        <p className="text-gray-500 mt-1">{t("billingSubtitle")}</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Wallet size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t("currentBalance")}</p>
              <p className="text-2xl font-bold text-gray-900">${balance.balance.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">{t("currentPlanLabel")}</p>
          <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${TIER_COLORS[balance.tier] ?? TIER_COLORS.FREE}`}>
            {balance.tier}
          </span>
          {balance.planExpiresAt && (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Clock size={12} /> {t("expiresLabel")} {new Date(balance.planExpiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">{t("paymentLabel")}</p>
          <p className="text-sm font-medium text-gray-700">{t("cryptoViaOxapay")}</p>
          <p className="text-xs text-gray-400 mt-1">{t("cryptoCoins")}</p>
        </div>
      </div>

      {/* Top Up */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <CreditCard size={18} /> {t("payByInvoice")}
          </h2>
          <p className="text-xs text-gray-400 mb-4">{t("invoiceNote")}</p>
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">{t("amountLabel", prices.minDeposit)}</label>
              <input type="number" min={prices.minDeposit} step={1} value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
            </div>
            <div className="flex items-end">
              <button onClick={handleInvoice} disabled={invoiceLoading}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                {invoiceLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                {t("generate")}
              </button>
            </div>
          </div>
          {payLink && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-green-700 font-medium">{t("paymentLinkReady")}</span>
              <a href={payLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium">
                {t("payNow")} <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <ArrowDownLeft size={18} /> {t("permanentDepositAddress")}
          </h2>
          <p className="text-xs text-gray-400 mb-4">{t("permanentDepositNote")}</p>
          {availableNetworks.length > 0 ? (
            <>
              <div className="flex gap-2">
                <select value={selectedNetwork} onChange={(e) => { setSelectedNetwork(e.target.value); setAddrError(null); }}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                  <option value="">{t("selectNetworkToGenerate")}</option>
                  {availableNetworks.map((n) => <option key={n.id} value={n.id}>{n.label} — {n.coin}</option>)}
                </select>
                <button onClick={handleGetAddress} disabled={addrLoading || !selectedNetwork}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                  {addrLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {t("generate")}
                </button>
              </div>
              {addrError && <p className="text-xs text-red-600 mt-2">{addrError}</p>}
            </>
          ) : (
            <p className="text-sm text-gray-500">{t("allNetworksGenerated")}</p>
          )}
        </div>
      </div>

      {/* Saved Addresses */}
      {savedAddresses.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <QrCode size={18} /> {t("yourDepositAddresses")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedAddresses.map((addr) => {
              const networkInfo = NETWORKS.find((n) => n.id === addr.network);
              return <AddressCard key={addr.id} saved={addr} networkInfo={networkInfo} />;
            })}
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-1">{t("upgradePlanTitle")}</h2>
        <p className="text-sm text-gray-500 mb-4">{t("billedMonthly")}</p>
        {planMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium border ${planMsg.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
            {planMsg.text}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = balance.tier === plan.tier;
            return (
              <div key={plan.tier} className={`relative rounded-xl border-2 p-5 ${plan.color} ${(plan as any).highlight ? "ring-2 ring-purple-300" : ""}`}>
                {(plan as any).highlight && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-0.5 rounded-full font-medium">{t("popularBadge")}</div>
                )}
                <h3 className="font-bold text-gray-800 text-lg">{plan.label}</h3>
                <div className="my-2">
                  <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500 text-sm">{t("perMonth")}</span>
                </div>
                <ul className="space-y-1 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle size={14} className="text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="w-full py-2 rounded-lg text-center text-sm font-medium bg-white text-gray-500 border border-gray-200">{t("currentPlanBtn")}</div>
                ) : (
                  <button onClick={() => handlePlanPurchase(plan.tier)}
                    disabled={!!planLoading || balance.balance < plan.price}
                    className={`w-full py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 ${plan.btnColor} flex items-center justify-center gap-2`}>
                    {planLoading === plan.tier && <Loader2 size={14} className="animate-spin" />}
                    {balance.balance < plan.price ? t("needMoreFunds", plan.price - balance.balance) : t("getPlan", plan.label)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{t("transactionHistory")}</h2>
        </div>
        {balance.transactions.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">{t("noTransactionsYet")}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {balance.transactions.map((tx) => (
              <div key={tx.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    {TX_ICONS[tx.type] ?? <TrendingUp size={14} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{tx.description ?? tx.type}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {tx.amount >= 0 ? "+" : ""}${tx.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">{t("balanceLabel")} ${tx.balanceAfter.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
