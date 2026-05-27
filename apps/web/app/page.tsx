/* Hallmark · pre-emit critique: P5 H4 E5 S4 R5 V4
 * genre: modern-minimal · theme: atmospheric-green
 * display: Bricolage Grotesque · body: IBM Plex Sans · wordmark: Fraunces
 * accent: oklch(50% 0.175 143) — used ≤ 3% per viewport
 */
"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  MessageCircle,
  Shield,
  Users,
  Zap,
  ChevronRight,
  Check,
  ArrowRight,
  Send,
} from "lucide-react";

// ── Sub-components ──────────────────────────────────────────────────────────

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm font-medium transition-colors"
      style={{ color: "var(--color-neutral)" }}
    >
      {children}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-semibold uppercase tracking-widest mb-3"
      style={{ color: "var(--color-muted)", letterSpacing: "0.10em" }}
    >
      {children}
    </p>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { data: session } = useSession();
  const isLoggedIn = !!session;
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}
    >

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          borderColor: "var(--color-rule)",
          background: "oklch(97% 0.008 143 / 0.94)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          className="max-w-6xl mx-auto px-6 flex items-center justify-between"
          style={{ height: "60px" }}
        >
          {/* Wordmark — Fraunces outlier (slot 1 of 2) */}
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--color-accent)" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="white"
                className="w-3.5 h-3.5"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
              </svg>
            </div>
            <span
              className="text-[15px] font-semibold tracking-tight font-wordmark"
              style={{ color: "var(--color-ink)" }}
            >
              WhatsAPI
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-7">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#how-it-works">How it works</NavLink>
            <NavLink href="/pricing">Pricing</NavLink>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="btn-accent text-sm font-semibold px-4 py-2 rounded-lg inline-flex items-center gap-1.5"
              >
                Dashboard <ArrowRight size={13} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden md:block text-sm font-medium transition-colors"
                  style={{ color: "var(--color-neutral)" }}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="btn-accent text-sm font-semibold px-4 py-2 rounded-lg"
                >
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero — asymmetric split ───────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="grid lg:grid-cols-[1fr_1.15fr] gap-14 items-center">

          {/* Left: statement + CTAs */}
          <div>
            <div
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-7 border"
              style={{
                background: "var(--color-paper-2)",
                borderColor: "var(--color-rule)",
                color: "var(--color-neutral)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--color-accent)" }}
              />
              Multi-channel messaging platform
            </div>

            <h1
              className="font-display font-bold mb-6 leading-none"
              style={{
                fontSize: "clamp(2.4rem, 4vw + 1rem, 3.6rem)",
                letterSpacing: "-0.025em",
                lineHeight: "1.08",
                color: "var(--color-ink)",
              }}
            >
              WhatsApp for your business.{" "}
              <span style={{ color: "var(--color-accent)" }}>
                One dashboard.
              </span>
            </h1>

            <p
              className="text-lg mb-9 max-w-md"
              style={{
                color: "var(--color-neutral)",
                lineHeight: "1.65",
                maxWidth: "38ch",
              }}
            >
              Connect your WhatsApp Cloud API, manage conversations as a team,
              run bulk campaigns — with Instagram and Messenger coming next.
            </p>

            <div className="flex items-center gap-3 flex-wrap mb-4">
              <Link
                href={isLoggedIn ? "/dashboard" : "/register"}
                className="btn-accent inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl"
              >
                {isLoggedIn ? "Go to Dashboard" : "Start for free"} <ArrowRight size={14} />
              </Link>
              <Link
                href="/pricing"
                className="btn-ghost inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl"
              >
                View pricing
              </Link>
            </div>

            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              Free plan available · No credit card required
            </p>
          </div>

          {/* Right: product preview — no fake browser chrome (Hallmark gate 57) */}
          <figure
            className="rounded-2xl overflow-hidden border shadow-sm m-0"
            style={{ borderColor: "var(--color-rule)" }}
          >
            <div className="flex" style={{ height: "360px", background: "white" }}>

              {/* Conversation list panel */}
              <div
                className="w-56 border-r flex flex-col shrink-0"
                style={{ borderColor: "var(--color-rule)" }}
              >
                <div
                  className="px-4 py-3 border-b"
                  style={{ borderColor: "var(--color-rule)" }}
                >
                  <p
                    className="text-xs font-semibold font-display"
                    style={{
                      color: "var(--color-neutral)",
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                    }}
                  >
                    Conversations
                  </p>
                </div>
                {[
                  { name: "Sarah K.",     preview: "When does my order ship?",    time: "2m",  unread: 2 },
                  { name: "+44 7700 9XX", preview: "Thanks for the quick reply!", time: "1h",  unread: 0 },
                  { name: "Michael T.",   preview: "Can I change my address?",    time: "3h",  unread: 1 },
                  { name: "+977 9841 XX", preview: "Hello, I need help",          time: "5h",  unread: 0 },
                  { name: "Priya S.",     preview: "Order confirmed, thank you",  time: "8h",  unread: 0 },
                ].map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-3 py-2.5 cursor-default"
                    style={{
                      background: i === 0 ? "var(--color-paper-2)" : "transparent",
                      borderBottom: `1px solid var(--color-rule)`,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{
                        background: `oklch(${50 - i * 4}% 0.${15 - i}3 143)`,
                        fontSize: "10px",
                      }}
                    >
                      {c.name.charAt(0)}
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span
                          className="text-xs font-semibold truncate"
                          style={{ color: "var(--color-ink)", fontSize: "11px" }}
                        >
                          {c.name}
                        </span>
                        <span
                          className="text-xs ml-1 shrink-0"
                          style={{ color: "var(--color-muted)", fontSize: "10px" }}
                        >
                          {c.time}
                        </span>
                      </div>
                      <span
                        className="text-xs truncate block"
                        style={{ color: "var(--color-neutral)", fontSize: "10px" }}
                      >
                        {c.preview}
                      </span>
                    </div>
                    {/* Unread badge */}
                    {c.unread > 0 && (
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{
                          background: "var(--color-accent)",
                          fontSize: "9px",
                        }}
                      >
                        {c.unread}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Active thread panel */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Thread header */}
                <div
                  className="px-4 py-3 border-b flex items-center gap-3 shrink-0"
                  style={{ borderColor: "var(--color-rule)" }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                    style={{ background: "oklch(50% 0.15 143)", fontSize: "10px" }}
                  >
                    S
                  </div>
                  <div>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: "var(--color-ink)", fontSize: "11px" }}
                    >
                      Sarah K.
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-muted)", fontSize: "10px" }}>
                      +1 (555) 012-3456
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: "var(--color-paper-2)",
                        color: "var(--color-accent)",
                        fontSize: "9px",
                        border: "1px solid var(--color-rule)",
                      }}
                    >
                      WhatsApp
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 px-4 py-3 space-y-2 overflow-hidden">
                  <div className="flex justify-start">
                    <div
                      className="rounded-2xl rounded-tl-sm px-3 py-2 text-xs max-w-[75%]"
                      style={{
                        background: "var(--color-paper-2)",
                        color: "var(--color-ink)",
                        fontSize: "11px",
                        lineHeight: "1.5",
                      }}
                    >
                      When does my order ship?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div
                      className="rounded-2xl rounded-tr-sm px-3 py-2 text-xs text-white max-w-[75%]"
                      style={{
                        background: "var(--color-accent)",
                        fontSize: "11px",
                        lineHeight: "1.5",
                      }}
                    >
                      Your order ships today! You'll receive a tracking link within the hour.
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div
                      className="rounded-2xl rounded-tl-sm px-3 py-2 text-xs max-w-[75%]"
                      style={{
                        background: "var(--color-paper-2)",
                        color: "var(--color-ink)",
                        fontSize: "11px",
                        lineHeight: "1.5",
                      }}
                    >
                      Amazing, thank you!
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div
                      className="rounded-2xl rounded-tr-sm px-3 py-2 text-xs text-white max-w-[80%]"
                      style={{
                        background: "var(--color-accent-s)",
                        fontSize: "11px",
                        lineHeight: "1.5",
                      }}
                    >
                      Happy to help. Let us know if you have any questions!
                    </div>
                  </div>
                </div>

                {/* Reply bar */}
                <div
                  className="px-3 py-2.5 border-t flex items-center gap-2 shrink-0"
                  style={{ borderColor: "var(--color-rule)" }}
                >
                  <div
                    className="flex-1 text-xs px-3 py-1.5 rounded-lg border"
                    style={{
                      borderColor: "var(--color-rule)",
                      color: "var(--color-muted)",
                      fontSize: "11px",
                    }}
                  >
                    Type a reply…
                  </div>
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "var(--color-accent)" }}
                  >
                    <Send size={10} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </figure>
        </div>
      </section>

      {/* ── Channel roadmap strip ─────────────────────────────────────────── */}
      <section
        className="py-14 border-y"
        style={{
          borderColor: "var(--color-rule)",
          background: "var(--color-paper-2)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel>Built for every channel</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "WhatsApp",
                status: "live",
                desc: "Live",
                icon: (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                  </svg>
                ),
              },
              {
                label: "Instagram",
                status: "soon",
                desc: "Coming soon",
                icon: (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4c0 3.2-2.6 5.8-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2zm-.2 2C5.6 4 4 5.6 4 7.6v8.8c0 2 1.6 3.6 3.6 3.6h8.8c2 0 3.6-1.6 3.6-3.6V7.6C20 5.6 18.4 4 16.4 4H7.6zM17.25 5.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10A5 5 0 0 1 12 7zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                  </svg>
                ),
              },
              {
                label: "Messenger",
                status: "soon",
                desc: "Coming soon",
                icon: (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.908 1.377 5.504 3.54 7.23V22l3.333-1.833A11.3 11.3 0 0 0 12 20.486c5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm1.071 12.45l-2.55-2.716-4.977 2.716 5.477-5.813 2.613 2.716 4.914-2.716-5.477 5.813z" />
                  </svg>
                ),
              },
              {
                label: "More channels",
                status: "soon",
                desc: "In roadmap",
                icon: (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zm1 11H7v2h6v3l4-4-4-4v3zm4-6H11V4L7 8l4 4V9h6V7z" />
                  </svg>
                ),
              },
            ].map((ch) => (
              <div
                key={ch.label}
                className="rounded-xl px-4 py-5 border flex flex-col items-center text-center gap-2"
                style={{
                  borderColor:
                    ch.status === "live"
                      ? "var(--color-accent)"
                      : "var(--color-rule)",
                  background:
                    ch.status === "live"
                      ? "oklch(97.5% 0.014 143)"
                      : "var(--color-paper)",
                  opacity: ch.status === "soon" ? 0.65 : 1,
                }}
              >
                <span
                  style={{
                    color:
                      ch.status === "live"
                        ? "var(--color-accent)"
                        : "var(--color-neutral)",
                  }}
                >
                  {ch.icon}
                </span>
                <div>
                  <p
                    className="text-sm font-semibold font-display"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {ch.label}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{
                      color:
                        ch.status === "live"
                          ? "var(--color-accent)"
                          : "var(--color-muted)",
                    }}
                  >
                    {ch.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-6">
        <div className="mb-14">
          <SectionLabel>Features</SectionLabel>
          <h2
            className="font-display font-bold mb-4"
            style={{
              fontSize: "clamp(2rem, 3vw + 0.5rem, 2.8rem)",
              letterSpacing: "-0.02em",
              color: "var(--color-ink)",
              lineHeight: "1.1",
            }}
          >
            Everything your team needs
          </h2>
          <p
            className="text-base"
            style={{
              color: "var(--color-neutral)",
              lineHeight: "1.65",
              maxWidth: "42ch",
            }}
          >
            From a single connected number to a full team inbox — manage it
            all from one place, without duct tape.
          </p>
        </div>

        {/* Feature grid — bordered cells, no card shadows */}
        <div
          className="grid md:grid-cols-3 border-t border-l"
          style={{ borderColor: "var(--color-rule)" }}
        >
          {[
            {
              icon: MessageCircle,
              title: "Real-time conversation inbox",
              desc: "All inbound messages from every connected account flow into one searchable inbox, updated live.",
            },
            {
              icon: Users,
              title: "Team roles & access control",
              desc: "Invite members and assign Viewer, Support, or Manager roles. Per-account permission scoping included.",
            },
            {
              icon: Shield,
              title: "Encrypted credentials",
              desc: "API keys and access tokens are AES-256 encrypted at rest. Never exposed in the UI or API responses.",
            },
            {
              icon: Send,
              title: "Bulk message campaigns",
              desc: "Send template campaigns to large contact lists with delivery tracking, rate-limiting, and read receipts.",
            },
            {
              icon: Zap,
              title: "All 11 webhook event fields",
              desc: "Subscribe to every Meta event — messages, quality alerts, template updates, and security notifications.",
            },
            {
              icon: ChevronRight,
              title: "Multi-account import",
              desc: "Import any number of WhatsApp Business accounts. Each is isolated and independently access-controlled.",
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="p-8 border-b border-r"
                style={{
                  borderColor: "var(--color-rule)",
                  background: "var(--color-paper)",
                }}
              >
                <div
                  className="inline-flex p-2 rounded-lg mb-5"
                  style={{ background: "var(--color-paper-2)" }}
                >
                  <Icon
                    size={16}
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
                <h3
                  className="text-base font-semibold mb-2 font-display"
                  style={{ color: "var(--color-ink)" }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-neutral)" }}
                >
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="py-24 border-t"
        style={{
          borderColor: "var(--color-rule)",
          background: "var(--color-paper-2)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14">
            <SectionLabel>How it works</SectionLabel>
            <h2
              className="font-display font-bold"
              style={{
                fontSize: "clamp(2rem, 3vw + 0.5rem, 2.8rem)",
                letterSpacing: "-0.02em",
                color: "var(--color-ink)",
                lineHeight: "1.1",
              }}
            >
              Up and running in 5 minutes
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Connect your WhatsApp account",
                desc: "Import your Cloud API credentials — App ID, App Secret, Phone Number ID, and Access Token from Meta Business Manager.",
              },
              {
                step: "02",
                title: "Register your webhook",
                desc: "One click registers WhatsAPI's endpoint with Meta. All 11 webhook event fields are subscribed automatically.",
              },
              {
                step: "03",
                title: "Invite your team",
                desc: "Add team members and assign roles. Everyone works from the same conversation inbox with their own access level.",
              },
            ].map((s) => (
              <div key={s.step}>
                <div
                  className="text-5xl font-bold mb-4 font-display"
                  style={{
                    color: "var(--color-rule)",
                    letterSpacing: "-0.04em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.step}
                </div>
                <h3
                  className="text-lg font-semibold mb-3 font-display"
                  style={{ color: "var(--color-ink)" }}
                >
                  {s.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-neutral)" }}
                >
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="py-24 max-w-6xl mx-auto px-6">
        <div className="mb-12">
          <SectionLabel>Pricing</SectionLabel>
          <h2
            className="font-display font-bold mb-3"
            style={{
              fontSize: "clamp(2rem, 3vw + 0.5rem, 2.8rem)",
              letterSpacing: "-0.02em",
              color: "var(--color-ink)",
              lineHeight: "1.1",
            }}
          >
            Simple, transparent pricing
          </h2>
          <p className="text-base" style={{ color: "var(--color-neutral)" }}>
            Start free. Upgrade as your team and contact base grows.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              tier: "Free",
              price: "$0",
              period: "",
              perks: ["1 WA account", "1 team member", "All core features"],
              featured: false,
            },
            {
              tier: "Standard",
              price: "$29",
              period: "/mo",
              perks: ["10 WA accounts", "2 team members", "Bulk send"],
              featured: false,
            },
            {
              tier: "Premium",
              price: "$99",
              period: "/mo",
              perks: ["100 WA accounts", "4 team members", "Priority support"],
              featured: true,
            },
            {
              tier: "Platinum",
              price: "Custom",
              period: "",
              perks: ["Unlimited accounts", "Unlimited members", "Dedicated support"],
              featured: false,
            },
          ].map((t) => (
            <div
              key={t.tier}
              className="rounded-2xl p-6 border flex flex-col"
              style={{
                borderColor: t.featured
                  ? "var(--color-accent)"
                  : "var(--color-rule)",
                background: t.featured
                  ? "oklch(97.5% 0.015 143)"
                  : "var(--color-paper)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-sm font-semibold font-display"
                  style={{ color: "var(--color-ink)" }}
                >
                  {t.tier}
                </span>
                {t.featured && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: "var(--color-accent)",
                      color: "white",
                      fontSize: "10px",
                    }}
                  >
                    Popular
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1 mb-5">
                <span
                  className="text-3xl font-bold font-display"
                  style={{
                    color: "var(--color-ink)",
                    letterSpacing: "-0.025em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t.price}
                </span>
                {t.period && (
                  <span
                    className="text-sm"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {t.period}
                  </span>
                )}
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {t.perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-2 text-sm"
                    style={{ color: "var(--color-neutral)" }}
                  >
                    <Check
                      size={12}
                      className="mt-0.5 shrink-0"
                      style={{ color: "var(--color-accent)" }}
                    />
                    {perk}
                  </li>
                ))}
              </ul>

              <Link
                href={t.tier === "Platinum" ? "/login" : "/register"}
                className="block text-center text-sm font-medium py-2 rounded-lg border transition-colors"
                style={{
                  borderColor: t.featured
                    ? "var(--color-accent)"
                    : "var(--color-rule)",
                  color: t.featured
                    ? "var(--color-accent)"
                    : "var(--color-neutral)",
                }}
              >
                {t.tier === "Platinum" ? "Contact us" : "Get started"}
              </Link>
            </div>
          ))}
        </div>

        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "var(--color-accent)" }}
        >
          Full feature comparison <ChevronRight size={13} />
        </Link>
      </section>

      {/* ── CTA — dark ink section ────────────────────────────────────────── */}
      <section
        className="py-24 border-t"
        style={{
          background: "var(--color-ink)",
          borderColor: "oklch(30% 0.008 143)",
        }}
      >
        <div className="max-w-2xl mx-auto px-6 text-center">
          {/* Fraunces wordmark outlier — slot 2 of 2 */}
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-8 font-wordmark"
            style={{
              color: "var(--color-accent)",
              letterSpacing: "0.14em",
            }}
          >
            WhatsAPI
          </p>
          <h2
            className="font-display font-bold mb-5"
            style={{
              fontSize: "clamp(2rem, 3.5vw + 0.5rem, 3rem)",
              letterSpacing: "-0.025em",
              color: "oklch(96% 0.008 143)",
              lineHeight: "1.1",
            }}
          >
            Ready to get started?
          </h2>
          <p
            className="text-base mb-8"
            style={{
              color: "oklch(70% 0.007 143)",
              lineHeight: "1.65",
            }}
          >
            Connect your first WhatsApp account in under 5 minutes.
            Free forever on the starter plan.
          </p>
          <Link
            href="/register"
            className="btn-accent inline-flex items-center gap-2 text-sm font-semibold px-7 py-3 rounded-xl"
          >
            Create your free account <ArrowRight size={14} />
          </Link>
          <p
            className="text-xs mt-4"
            style={{ color: "oklch(50% 0.007 143)" }}
          >
            No credit card required
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="border-t py-10"
        style={{
          borderColor: "oklch(28% 0.010 143)",
          background: "var(--color-ink)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{ background: "var(--color-accent)" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="white"
                className="w-3 h-3"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
              </svg>
            </div>
            <span
              className="text-sm font-semibold font-display"
              style={{ color: "oklch(82% 0.008 143)" }}
            >
              WhatsAPI
            </span>
          </div>
          <div
            className="flex items-center gap-6 text-sm"
            style={{ color: "oklch(50% 0.007 143)" }}
          >
            <Link
              href="/pricing"
              className="transition-colors hover:text-white"
              style={{ color: "inherit" }}
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="transition-colors hover:text-white"
              style={{ color: "inherit" }}
            >
              Sign in
            </Link>
            <span>© {new Date().getFullYear()} WhatsAPI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
