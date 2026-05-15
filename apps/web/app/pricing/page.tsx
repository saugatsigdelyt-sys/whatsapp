import Link from "next/link";
import { Check, ChevronLeft, MessageSquare, Phone, Mail } from "lucide-react";

const tiers = [
  {
    key: "FREE",
    label: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying it out",
    maxWaAccounts: 1,
    maxTeamMembers: 1,
    additionalMembers: 0,
    features: [
      "1 WhatsApp account",
      "Owner only (1 seat)",
      "All 11 webhook fields",
      "Real-time message inbox",
      "Account event logs",
      "AES-256 credential encryption",
      "Community support",
    ],
    notIncluded: ["Additional team members", "Per-account access control"],
    cta: "Get started free",
    href: "/register",
    highlighted: false,
    badge: null,
    color: "border-gray-200",
    btnClass: "bg-gray-900 hover:bg-gray-700 text-white",
  },
  {
    key: "STANDARD",
    label: "Standard",
    price: "$29",
    period: "per month",
    description: "For growing businesses",
    maxWaAccounts: 10,
    maxTeamMembers: 2,
    additionalMembers: 1,
    features: [
      "10 WhatsApp accounts",
      "2 team members (1 additional)",
      "All 11 webhook fields",
      "Real-time message inbox",
      "Account event logs",
      "AES-256 credential encryption",
      "Per-account team access control",
      "Email support",
    ],
    notIncluded: [],
    cta: "Start free trial",
    href: "/register?plan=standard",
    highlighted: false,
    badge: null,
    color: "border-blue-200",
    btnClass: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    key: "PREMIUM",
    label: "Premium",
    price: "$99",
    period: "per month",
    description: "For agencies & power users",
    maxWaAccounts: 100,
    maxTeamMembers: 4,
    additionalMembers: 3,
    features: [
      "100 WhatsApp accounts",
      "4 team members (3 additional)",
      "All 11 webhook fields",
      "Real-time message inbox",
      "Account event logs",
      "AES-256 credential encryption",
      "Per-account team access control",
      "Priority support",
      "Advanced analytics (coming soon)",
    ],
    notIncluded: [],
    cta: "Start free trial",
    href: "/register?plan=premium",
    highlighted: true,
    badge: "Most Popular",
    color: "border-purple-400",
    btnClass: "bg-purple-600 hover:bg-purple-700 text-white",
  },
  {
    key: "PLATINUM",
    label: "Platinum",
    price: "Custom",
    period: "contact us",
    description: "For enterprises at scale",
    maxWaAccounts: null,
    maxTeamMembers: null,
    additionalMembers: null,
    features: [
      "Unlimited WhatsApp accounts",
      "Unlimited team members",
      "All 11 webhook fields",
      "Real-time message inbox",
      "Account event logs",
      "AES-256 credential encryption",
      "Per-account team access control",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom integrations",
      "On-premise deployment option",
      "Priority onboarding",
    ],
    notIncluded: [],
    cta: "Contact sales",
    href: "mailto:sales@yourdomain.com",
    highlighted: false,
    badge: "Enterprise",
    color: "border-yellow-400",
    btnClass: "bg-yellow-500 hover:bg-yellow-600 text-white",
  },
];

const faqs = [
  {
    q: "Can I change my plan later?",
    a: "Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately. Downgrades take effect at the end of your billing cycle.",
  },
  {
    q: "What counts as a WhatsApp account?",
    a: "Each set of credentials (App ID + System User Token + WABA ID) you import counts as one account. One account can have multiple phone numbers.",
  },
  {
    q: "What happens if I exceed my team member limit?",
    a: "You'll see an error when trying to invite new members and will be prompted to upgrade. Existing members are never removed.",
  },
  {
    q: "Is there a free trial for paid plans?",
    a: "Yes — Standard and Premium plans include a 14-day free trial. No credit card required to start.",
  },
  {
    q: "What is the Platinum plan?",
    a: "Platinum is our enterprise plan with unlimited accounts and team members, an SLA, dedicated support, and the option for on-premise deployment. Contact our sales team for a custom quote.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900">WA Platform</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
            <Link href="/register" className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8">
          <ChevronLeft size={14} /> Back to home
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Start free, upgrade as you grow. All plans include every webhook field, real-time messaging, and credential encryption.
        </p>
      </div>

      {/* Tier cards */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`relative rounded-2xl border-2 ${tier.color} p-6 flex flex-col ${tier.highlighted ? "shadow-lg shadow-purple-100" : ""}`}
            >
              {tier.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full ${tier.highlighted ? "bg-purple-600 text-white" : "bg-yellow-500 text-white"}`}>
                  {tier.badge}
                </div>
              )}

              <div className="mb-6">
                <div className="font-bold text-gray-900 text-lg mb-1">{tier.label}</div>
                <div className="text-3xl font-extrabold text-gray-900 mb-0.5">{tier.price}</div>
                <div className="text-xs text-gray-400">{tier.period}</div>
                <div className="text-sm text-gray-500 mt-2">{tier.description}</div>
              </div>

              {/* Limits highlight */}
              <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MessageSquare size={13} className="text-gray-400" />
                  {tier.maxWaAccounts === null ? "Unlimited" : tier.maxWaAccounts} WhatsApp account{tier.maxWaAccounts !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Phone size={13} className="text-gray-400" />
                  {tier.maxTeamMembers === null ? "Unlimited" : tier.maxTeamMembers} team member{tier.maxTeamMembers !== 1 ? "s" : ""}
                  {tier.additionalMembers !== null && tier.additionalMembers > 0 && (
                    <span className="text-xs text-gray-400">+{tier.additionalMembers} extra</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
                {tier.notIncluded.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-400 line-through">
                    <span className="mt-0.5 flex-shrink-0 text-gray-300">✕</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${tier.btnClass}`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Enterprise contact strip */}
        <div className="mt-10 bg-gray-900 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-white font-bold text-lg mb-1">Need something custom?</h3>
            <p className="text-gray-400 text-sm">
              Platinum gives you unlimited everything — accounts, team members, custom integrations, and dedicated support. Talk to our team.
            </p>
          </div>
          <Link
            href="mailto:sales@yourdomain.com"
            className="flex items-center gap-2 bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl text-sm hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            <Mail size={15} /> Contact sales
          </Link>
        </div>

        {/* Comparison table */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Full feature comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 pr-6 text-sm font-semibold text-gray-600 w-1/3">Feature</th>
                  {["Free", "Standard", "Premium", "Platinum"].map((t) => (
                    <th key={t} className="text-center py-3 px-4 text-sm font-semibold text-gray-900">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { feature: "WhatsApp accounts", values: ["1", "10", "100", "Unlimited"] },
                  { feature: "Team members", values: ["1", "2", "4", "Unlimited"] },
                  { feature: "Additional seats", values: ["—", "+1", "+3", "Custom"] },
                  { feature: "All 11 webhook fields", values: [true, true, true, true] },
                  { feature: "Real-time message inbox", values: [true, true, true, true] },
                  { feature: "Account event logs", values: [true, true, true, true] },
                  { feature: "AES-256 encryption", values: [true, true, true, true] },
                  { feature: "Per-account team access", values: [false, true, true, true] },
                  { feature: "Priority support", values: [false, false, true, true] },
                  { feature: "Dedicated account manager", values: [false, false, false, true] },
                  { feature: "SLA guarantee", values: [false, false, false, true] },
                  { feature: "On-premise deployment", values: [false, false, false, true] },
                ].map((row) => (
                  <tr key={row.feature} className="hover:bg-gray-50">
                    <td className="py-3 pr-6 text-sm text-gray-700">{row.feature}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="py-3 px-4 text-center text-sm">
                        {typeof v === "boolean" ? (
                          v ? <Check size={15} className="text-green-500 mx-auto" /> : <span className="text-gray-300">—</span>
                        ) : (
                          <span className="font-medium text-gray-800">{v}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
