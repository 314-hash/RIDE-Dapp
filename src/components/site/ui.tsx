import { Link } from "@tanstack/react-router";
import { ChevronDown, CircleCheck, CircleDashed, Info } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { FeatureStatus } from "@/config/app";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50";
export const btn = {
  primary: cn(btnBase, "bg-primary text-primary-foreground hover:bg-primary-hover shadow-soft"),
  secondary: cn(btnBase, "border border-border bg-background text-foreground hover:bg-secondary"),
  ghostDark: cn(btnBase, "border border-ink-foreground/30 text-ink-foreground hover:bg-ink-foreground/10"),
  light: cn(btnBase, "bg-background text-foreground hover:bg-secondary"),
};

export function Wordmark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5 font-bold tracking-tight", className)} aria-label="RIDE TOKENS home">
      <img
        src="/ride-token-logo.jpg"
        alt="RIDE TOKEN on Sidra Chain logo"
        className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/50 shadow-soft"
      />
      <span className={cn("text-lg font-extrabold", inverted ? "text-ink-foreground" : "text-foreground")}>
        RIDE <span className="text-primary">TOKENS</span>
      </span>
    </Link>
  );
}

export function Section({ children, className, id, tone = "default" }: { children: ReactNode; className?: string; id?: string; tone?: "default" | "muted" }) {
  return (
    <section id={id} className={cn("py-16 sm:py-24", tone === "muted" && "bg-secondary", className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, children, center }: { eyebrow?: string; title: string; children?: ReactNode; center?: boolean }) {
  return (
    <div className={cn("mb-10 max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
      {children && <p className="mt-4 text-lg text-muted-foreground">{children}</p>}
    </div>
  );
}

export function FeatureCard({ icon, title, children, badge }: { icon: ReactNode; title: string; children: ReactNode; badge?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">{icon}</div>
        {badge}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground">{children}</p>
    </div>
  );
}

const statusStyle: Record<FeatureStatus, string> = {
  Live: "bg-success/10 text-success",
  Planned: "bg-accent text-accent-foreground",
  "Under Development": "bg-warning/15 text-foreground",
  Unavailable: "bg-secondary text-muted-foreground",
};
export function StatusPill({ status }: { status: FeatureStatus }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusStyle[status])}>{status}</span>;
}

export function DemoBanner({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function CheckRow({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="font-medium">{label}</span>
      <span className={cn("flex items-center gap-1.5 text-sm", ok ? "text-success" : "text-muted-foreground")}>
        {ok ? <CircleCheck className="h-4 w-4" aria-hidden /> : <CircleDashed className="h-4 w-4" aria-hidden />}
        {ok ? "Verified" : note ?? "Not yet verified"}
      </span>
    </li>
  );
}

export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-card">
      {items.map((it) => (
        <details key={it.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
            {it.q}
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="mt-3 text-muted-foreground">{it.a}</div>
        </details>
      ))}
    </div>
  );
}

export function Field({ label, error, id, children, hint }: { label: string; error?: string | undefined; id: string; children: ReactNode; hint?: string | undefined }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8", className)} {...props} />;
}
