import { Link } from "@tanstack/react-router";
import { Menu, X, Shield, Coins } from "lucide-react";
import { useState, type ReactNode } from "react";
import { appConfig } from "@/config/app";
import { Wordmark, btn } from "./ui";
import { WalletWidget } from "./WalletWidget";

const nav = [
  { to: "/", label: "Home" },
  { to: "/book", label: "Ride Booking" },
  { to: "/drive", label: "Driver Cockpit" },
  { to: "/token", label: "RIDE Token DApp" },
  { to: "/safety", label: "Safety Center" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wordmark />
          <span className="hidden items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sidra Chain 97453
          </span>
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground bg-secondary font-bold" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <WalletWidget />

          <Link
            to="/book"
            className={`${btn.primary} hidden !py-2 !px-4 text-xs font-bold sm:inline-flex`}
          >
            Book a Ride
          </Link>

          <button
            className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-secondary lg:hidden"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5 text-foreground" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-4 py-4 lg:hidden animate-in slide-in-from-top-2" aria-label="Mobile">
          <div className="container-page flex flex-col space-y-2">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 font-semibold text-sm hover:bg-secondary transition-colors"
                activeProps={{ className: "bg-secondary text-primary font-bold" }}
              >
                {n.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-border">
              <Link
                to="/book"
                onClick={() => setOpen(false)}
                className={`${btn.primary} w-full text-center text-sm`}
              >
                Book a Ride
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const c = appConfig.contact;
  return (
    <footer className="bg-ink text-ink-foreground border-t border-ink-foreground/10">
      <div className="container-page grid gap-10 py-14 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-4">
          <Wordmark inverted />
          <p className="text-sm font-semibold text-primary">{appConfig.slogan}</p>
          <p className="max-w-md text-sm text-ink-foreground/75 leading-relaxed">{appConfig.mission}</p>

          {/* Official Logo Image Banner in Footer */}
          <div className="flex items-center gap-4 rounded-2xl bg-white/5 border border-purple-500/30 p-3.5 max-w-md shadow-lg shadow-purple-900/20">
            <img
              src="/ride-token-logo.jpg"
              alt="RIDE TOKEN on Sidra Chain logo"
              className="h-16 w-16 rounded-xl object-cover ring-2 ring-purple-500/60 shadow-md shrink-0"
            />
            <div className="text-xs">
              <p className="font-extrabold text-white text-sm tracking-wide">RIDE TOKEN</p>
              <p className="text-purple-400 font-semibold">ON SIDRA CHAIN</p>
              <p className="text-ink-foreground/60 font-mono text-[11px] mt-0.5">Chain ID: 97453 • Decentralized Mobility</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-foreground/60 pt-1">
            <span className="rounded bg-white/10 px-2.5 py-1 font-mono">Contract: 0xe91c...F9b7</span>
            <span className="rounded bg-white/10 px-2.5 py-1 font-mono">DEX WSDA Pool: 0x4a65...6027</span>
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Mobility & DApp</h3>
          <ul className="space-y-2 text-sm text-ink-foreground/70">
            {nav.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="hover:text-ink-foreground transition-colors">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Security & Safety</h3>
          <ul className="space-y-2 text-sm text-ink-foreground/70">
            <li>
              <Link to="/safety" className="hover:text-ink-foreground transition-colors flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-400" /> Safety Center
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-ink-foreground transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-ink-foreground transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/token" className="hover:text-ink-foreground transition-colors flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-cyan-400" /> RIDE Contract
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-foreground/10">
        <p className="container-page py-5 text-xs text-ink-foreground/60">
          © {new Date().getFullYear()} RIDE TOKENS — Smart Mobility & Ride Booking on Sidra Chain.
          Decentralized coordination, transparent fare bidding, and token utility rewards.
        </p>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
