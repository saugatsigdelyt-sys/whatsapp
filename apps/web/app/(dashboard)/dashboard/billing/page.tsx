"use client";

import { useState } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import {
  Wallet, TrendingUp, CreditCard, ArrowDownLeft,
  CheckCircle, Clock, XCircle, Copy, ExternalLink, Loader2,
} from "lucide-react";

type Tx = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
};

type BalanceData = {
  balance: number;
  planExpiresAt: string | null;
  tier: string;
  transactions: Tx[];
};

type Prices = {
  STANDARD: number;
  PREMIUM: number;
  PLATINUM: number;
  minDeposit: number;
};

const NETWORKS = [
  { id: "TRX", label: "TRON (TRC-20)", coin: "USDT / USDC / TRX" },
  { id: "ETH", label: "Ethereum (ERC-20)", coin: "USDT / USDC / ETH" },
  { id: "BSC", label: "BNB Smart Chain", coin: "USDT / USDC / BNB" },
  { id: "LTC", label: "Litecoin", coin: "LTC" },
  { id: "BTC", label: "Bitcoin", coin: "BTC" },
];

const TIER_COLORS: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  STANDARD: "bg-blue-100 text-blue-700",
  PREMIUM: "bg-purple-100 text-purple-700",
  PLATINUM: "bg-yellow-100 text-yellow-700",
};

const TX_ICONS: Record<string, React.ReactNode> = {
  DEPOSIT: <ArrowDownLeft size={14} className="text-green-600" />,
  PLAN_PURCHASE: <CreditCard size={14} className="text-blue-600" />,
  ADMIN_CREDIT: <TrendingUp size={14} className="text-green-600" />,
  ADMIN_DEBIT: <TrendingUp size={14} className="text-red-600 rotate-180" />,
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
    <button onClick={handleCopy} className="ml-2 text-gray-400 hover:text-gray-700 transition-colors" title="Copy">
      {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  );
}

export default function BillingPage() {
  const { data: balData, mutate: mutateBalance } = useSWR<{ success: boolean; data: BalanceData }>(
    "/api/payments/balance",
    (url: string) => api.get(url).then((r) => r.data)
  );
  const { data: pricesData } = useSWR<{ success: boolean; data: Prices }>(
    "/api/payments/prices",
    (url: string) => api.get(url).then((r) => r.data)
  );

  const balance = balData?.data ?? { balance: 0, planExpiresAt: null, tier: "FREE", transactions: [] };
  const prices = pricesData?.data ?? { STANDARD: 20, PREMIUM: 50, PLATINUM: 100, minDeposit: 5 };

  // Invoice state
  const [invoiceAmount, setInvoiceAmount] = useState(prices.minDeposit || 10);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [payLink, setPayLink] = useState<string | null>(null);

  // Static address state
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [addrLoading, setAddrLoading] = useState(false);
  const [staticAddr, setStaticAddr] = useState<{ address: string; network: string } | null>(null);

  // Plan purchase state
  const [planLoading, setPlanLoading] = useState<string>("");
  const [planMsg, setPlanMsg] = useState<string | null>(null);

  async function handleInvoice() {
    setInvoiceLoading(true);
    setPayLink(null);
    try {
      const res = await api.post("/api/payments/invoice", { amount: invoiceAmount });
      setPayLink(res.data.data.payLink);
    } catch (err: any) {
      alert(err?.response?.data?.error ?? "Failed to create invoice");
    } finally {
      setInvoiceLoading(false);
    }
  }

  async function handleStaticAddress() {
    if (!selectedNetwork) return;
    setAddrLoading(true);
    setStaticAddr(null);
    try {
      const res = await api.post("/api/payments/static-address", { network: selectedNetwork });
      setStaticAddr(res.data.data);
    } catch (err: any) {
      alert(err?.response?.data?.error ?? "Failed to get address");
    } finally {
      setAddrLoading(false);
    }
  }

  async function handlePlanPurchase(tier: string) {
    if (!confirm(`Purchase ${tier} plan for $${prices[tier as keyof Prices]} from your balance?`)) return;
    setPlanLoading(tier);
    setPlanMsg(null);
    try {
      const res = await api.post("/api/payments/plan/purchase", { tier });
      setPlanMsg(res.data.message);
      mutateBalance();
    } catch (err: any) {
      setPlanMsg(err?.response?.data?.error ?? "Purchase failed");
    } finally {
      setPlanLoading("");
    }
  }

  const plans = [
    {
      tier: "STANDARD",
      label: "Standard",
      price: prices.STANDARD,
      features: ["3 WA Accounts", "5 Team members", "All messaging features"],
      color: "border-blue-300 bg-blue-50",
      btnColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      tier: "PREMIUM",
      label: "Premium",
      price: prices.PREMIUM,
      features: ["10 WA Accounts", "20 Team members", "Priority support"],
      color: "border-purple-300 bg-purple-50",
      btnColor: "bg-purple-600 hover:bg-purple-700",
      highlight: true,
    },
    {
      tier: "PLATINUM",
      label: "Platinum",
      price: prices.PLATINUM,
      features: ["50 WA Accounts", "100 Team members", "Dedicated support"],
      color: "border-yellow-300 bg-yellow-50",
      btnColor: "bg-yellow-600 hover:bg-yellow-700",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="text-gray-500 mt-1">Manage your balance and subscription</p>
      </div>

      {/* Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm md:col-span-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Wallet size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Current Balance</p>
              <p className="text-2xl font-bold text-gray-900">${balance.balance.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm md:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Current Plan</p>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${TIER_COLORS[balance.tier] ?? TIER_COLORS.FREE}`}>
              {balance.tier}
            </span>
          </div>
          {balance.planExpiresAt && (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Clock size={12} />
              Expires {new Date(balance.planExpiresAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm md:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Payment Methods</p>
          <p className="text-sm text-gray-700 font-medium">Crypto via OxaPay</p>
          <p className="text-xs text-gray-400 mt-1">BTC, ETH, USDT, LTC, BNB + more</p>
        </div>
      </div>

      {/* Top Up Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard size={18} /> Pay by Invoice
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Create a one-time payment link. Choose any supported cryptocurrency at checkout.
          </p>
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Amount (USD)</label>
              <input
                type="number"
                min={prices.minDeposit}
                step={1}
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleInvoice}
                disabled={invoiceLoading}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {invoiceLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                Generate
              </button>
            </div>
          </div>
          {payLink && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-green-700 font-medium">Payment link ready!</span>
              <a
                href={payLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium"
              >
                Pay now <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* Static Address */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ArrowDownLeft size={18} /> Static Deposit Address
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Get a permanent crypto address. Any deposit automatically credits your balance.
          </p>
          <div className="flex gap-2 mb-4">
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">Select network…</option>
              {NETWORKS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} — {n.coin}
                </option>
              ))}
            </select>
            <button
              onClick={handleStaticAddress}
              disabled={addrLoading || !selectedNetwork}
              className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {addrLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              Get Address
            </button>
          </div>
          {staticAddr && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Send to this address ({staticAddr.network}):</p>
              <div className="flex items-center">
                <code className="text-xs text-gray-800 font-mono break-all">{staticAddr.address}</code>
                <CopyButton text={staticAddr.address} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-1">Upgrade Plan</h2>
        <p className="text-sm text-gray-500 mb-4">
          Plans are billed monthly from your balance. Min deposit: ${prices.minDeposit}
        </p>
        {planMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${planMsg.includes("activated") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {planMsg}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = balance.tier === plan.tier;
            return (
              <div
                key={plan.tier}
                className={`relative rounded-xl border-2 p-5 ${plan.color} ${plan.highlight ? "ring-2 ring-purple-300" : ""}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-0.5 rounded-full font-medium">
                    Popular
                  </div>
                )}
                <h3 className="font-bold text-gray-800 text-lg">{plan.label}</h3>
                <div className="my-2">
                  <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500 text-sm">/mo</span>
                </div>
                <ul className="space-y-1 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle size={14} className="text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="w-full py-2 rounded-lg text-center text-sm font-medium bg-white text-gray-500 border border-gray-200">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handlePlanPurchase(plan.tier)}
                    disabled={!!planLoading || balance.balance < plan.price}
                    className={`w-full py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 ${plan.btnColor} flex items-center justify-center gap-2`}
                  >
                    {planLoading === plan.tier && <Loader2 size={14} className="animate-spin" />}
                    {balance.balance < plan.price ? `Need $${(plan.price - balance.balance).toFixed(2)} more` : `Get ${plan.label}`}
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
          <h2 className="font-semibold text-gray-800">Transaction History</h2>
        </div>
        {balance.transactions.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">No transactions yet</div>
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
                  <p className="text-xs text-gray-400">Balance: ${tx.balanceAfter.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
