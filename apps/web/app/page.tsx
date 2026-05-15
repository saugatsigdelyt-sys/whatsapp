import Link from "next/link";
import { MessageSquare, Webhook, Users, Shield, Zap, ChevronRight, Check } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900">WA Platform</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
            <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Sign in</Link>
            <Link href="/register" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-full border border-brand-100 mb-6">
          <span className="w-1.5 h-1.5 bg-brand-600 rounded-full"></span>
          Now in developer preview
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6 max-w-3xl mx-auto">
          Manage all your WhatsApp Business accounts in one place
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Connect your WhatsApp Cloud API, receive messages in real time, subscribe to all webhook events, and let your team collaborate — all from a single dashboard.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/register" className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 text-sm">
            Start for free <ChevronRight size={16} />
          </Link>
          <Link href="/pricing" className="text-gray-700 font-medium px-6 py-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors text-sm">
            View pricing
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">No credit card required · Free plan available</p>

        {/* Hero image placeholder */}
        <div className="mt-16 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm max-w-4xl mx-auto">
          <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-xs text-gray-400 ml-2">dashboard.yourdomain.com</span>
          </div>
          <div className="p-6 grid grid-cols-4 gap-4">
            {[
              { label: "Total Messages", value: "1,284", color: "bg-blue-50" },
              { label: "Inbound", value: "847", color: "bg-green-50" },
              { label: "Outbound", value: "437", color: "bg-purple-50" },
              { label: "Today", value: "12", color: "bg-orange-50" },
            ].map((s) => (
              <div key={s.label} className={`${s.color} rounded-xl p-4`}>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex justify-between text-xs font-medium text-gray-500 uppercase tracking-wide">
                <span>Recent Messages</span><span className="text-brand-600">View all</span>
              </div>
              {[
                { from: "+977 98410XXXXX", msg: "Hello, I need help with my order", status: "Received", badge: "bg-green-50 text-green-700" },
                { from: "+1 415 555 XXXX", msg: "When will my delivery arrive?", status: "Read", badge: "bg-purple-50 text-purple-700" },
                { from: "+44 7700 9XXXXX", msg: "Thanks for the quick response!", status: "Delivered", badge: "bg-indigo-50 text-indigo-700" },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-mono text-gray-500">{row.from}</span>
                  <span className="text-xs text-gray-700 flex-1 mx-4 truncate">{row.msg}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.badge}`}>{row.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything you need to manage WhatsApp at scale</h2>
            <p className="text-gray-500 max-w-xl mx-auto">From a single number to hundreds of accounts across your entire team.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: MessageSquare,
                color: "bg-blue-100 text-blue-600",
                title: "Real-time Message Inbox",
                desc: "All inbound and outbound messages from every connected account flow into one searchable inbox, updated live.",
              },
              {
                icon: Webhook,
                color: "bg-green-100 text-green-600",
                title: "All 11 Webhook Fields",
                desc: "Subscribe to every Meta webhook event — messages, account alerts, template updates, phone quality, security events, and more.",
              },
              {
                icon: Users,
                color: "bg-purple-100 text-purple-600",
                title: "Team Access Control",
                desc: "Invite team members and assign them access to specific WhatsApp accounts. Owners keep full control.",
              },
              {
                icon: Shield,
                color: "bg-red-100 text-red-600",
                title: "Encrypted Credentials",
                desc: "All API keys and tokens are AES-256 encrypted at rest. We never expose your secrets in the UI.",
              },
              {
                icon: Zap,
                color: "bg-yellow-100 text-yellow-600",
                title: "Multi-Account Import",
                desc: "Import multiple WhatsApp Business accounts with their own App ID, Secret, and Access Token. Scale up with your plan.",
              },
              {
                icon: ChevronRight,
                color: "bg-gray-100 text-gray-600",
                title: "Developer-Friendly",
                desc: "Built on the official WhatsApp Cloud API (v19+). Full REST API, TypeScript codebase, and open-source friendly.",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className={`inline-flex p-2.5 rounded-xl ${f.color} mb-4`}>
                    <Icon size={18} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500">Start free. Upgrade as you grow.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { tier: "Free", price: "$0", accounts: "1 account", members: "1 member", color: "border-gray-200" },
            { tier: "Standard", price: "$29/mo", accounts: "10 accounts", members: "2 members", color: "border-blue-200" },
            { tier: "Premium", price: "$99/mo", accounts: "100 accounts", members: "4 members", color: "border-purple-300 ring-2 ring-purple-100" },
            { tier: "Platinum", price: "Custom", accounts: "Unlimited", members: "Unlimited", color: "border-yellow-300" },
          ].map((t) => (
            <div key={t.tier} className={`border ${t.color} rounded-xl p-5 text-center`}>
              <div className="font-bold text-gray-900 mb-1">{t.tier}</div>
              <div className="text-xl font-bold text-gray-900 mb-3">{t.price}</div>
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-1.5 justify-center"><Check size={11} className="text-green-500" />{t.accounts}</div>
                <div className="flex items-center gap-1.5 justify-center"><Check size={11} className="text-green-500" />{t.members}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link href="/pricing" className="inline-flex items-center gap-2 text-brand-600 font-medium text-sm hover:underline">
            See full feature comparison <ChevronRight size={14} />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-brand-100 mb-8 text-lg">Connect your first WhatsApp account in under 5 minutes. Free forever.</p>
          <Link href="/register" className="bg-white text-brand-600 font-semibold px-8 py-3 rounded-xl hover:bg-brand-50 transition-colors inline-block text-sm">
            Create free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700">WA Platform</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
            <Link href="/login" className="hover:text-gray-600">Sign in</Link>
            <span>© {new Date().getFullYear()} WA Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
