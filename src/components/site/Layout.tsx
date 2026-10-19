import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { appConfig } from "@/config/app";
import { Wordmark, btn } from "./ui";

const nav = [
  { to: "/", label: "Home" },
  { to: "/book", label: "Ride Booking" },
  { to: "/drive", label: "Drive With Us" },
  { to: "/token", label: "RIDE Token" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Wordmark />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              activeProps={{ className: "text-foreground bg-secondary" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/book" className={`${btn.primary} hidden !py-2 sm:inline-flex`}>Book a Ride</Link>
          <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border bg-background md:hidden" aria-label="Mobile">
          <div className="container-page flex flex-col py-3">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-medium hover:bg-secondary">
                {n.label}
              </Link>
            ))}
            <Link to="/book" onClick={() => setOpen(false)} className={`${btn.primary} mt-2`}>Book a Ride</Link>
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const c = appConfig.contact;
  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Wordmark inverted />
          <p className="mt-2 text-sm font-medium text-primary">{appConfig.slogan}</p>
          <p className="mt-4 max-w-md text-sm text-ink-foreground/70">{appConfig.mission}</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Explore</h3>
          <ul className="space-y-2 text-sm text-ink-foreground/70">
            {nav.map((n) => <li key={n.to}><Link to={n.to} className="hover:text-ink-foreground">{n.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Company</h3>
          <ul className="space-y-2 text-sm text-ink-foreground/70">
            <li><Link to="/privacy" className="hover:text-ink-foreground">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-ink-foreground">Terms of Service</Link></li>
            <li><Link to="/safety" className="hover:text-ink-foreground">Safety</Link></li>
            <li>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <span>Contact details coming soon</span>}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-foreground/10">
        <p className="container-page py-5 text-xs text-ink-foreground/60">
          © {new Date().getFullYear()} RIDE TOKENS. This site runs in demo mode — no live rides, payments or token transactions are processed. Nothing here is investment advice.
        </p>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
