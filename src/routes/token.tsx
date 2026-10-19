import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy, Gift, Handshake, Coins, Wallet, Car } from "@/components/site/icons";
import { PageShell } from "@/components/site/Layout";
import { Card, CheckRow, Faq, FeatureCard, Section, SectionHeading, StatusPill, btn } from "@/components/site/ui";
import { appConfig, contractStatus } from "@/config/app";
import banner from "@/assets/ride-banner.jpg.asset.json";

export const Route = createFileRoute("/token")({
  head: () => ({
    meta: [
      { title: "RIDE Token DApp — RIDE TOKENS" },
      { name: "description", content: "RIDE Token: digital utility for the RIDE TOKENS mobility ecosystem. Contract details, verification status and roadmap." },
      { property: "og:title", content: "RIDE Token DApp — RIDE TOKENS" },
      { property: "og:description", content: "Connecting Mobility With Digital Utility." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TokenPage,
});

function TokenPage() {
  const [copied, setCopied] = useState(false);
  const d = appConfig.dapp;
  const s = contractStatus();
  const copy = async () => {
    await navigator.clipboard.writeText(d.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageShell>
      <section className="hero-fallback">
        <div className="container-page grid items-center gap-10 py-20 text-ink-foreground lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-4">Digital Mobility Ecosystem.</p>
            <h1 className="text-4xl font-bold sm:text-6xl">Connecting Mobility With Digital Utility.</h1>
            <p className="mt-5 max-w-xl text-lg text-ink-foreground/80">RIDE TOKENS explores how blockchain-based functionality can support a connected mobility experience for passengers, drivers, and ecosystem partners.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#ecosystem" className={btn.primary}>Explore the Ecosystem</a>
              <Link to="/book" className={btn.ghostDark}>Book a Ride</Link>
            </div>
          </div>
          <img src={banner.url} alt="RIDE ecosystem banner supplied by the project owner" className="w-full rounded-2xl shadow-lift" />
        </div>
      </section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <p className="eyebrow mb-2">DApp Contract Address — supplied by project owner</p>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-sm">{d.contractAddress}</code>
              <button onClick={copy} className="rounded-lg p-2 hover:bg-background" aria-label="Copy contract address">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Network</dt><dd className="text-right font-medium">{d.networkName ?? `Not yet verified (owner materials indicate ${d.ownerIndicatedNetwork})`}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Contract type</dt><dd className="font-medium">Not yet verified</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Block explorer</dt><dd className="font-medium">{d.explorerUrl ? <a className="text-primary underline" href={`${d.explorerUrl}/address/${d.contractAddress}`} target="_blank" rel="noreferrer">View</a> : "Available after verification"}</dd></div>
            </dl>
          </Card>
          <Card>
            <h2 className="text-xl font-bold">Contract status</h2>
            <ul className="mt-3">
              <CheckRow label="Address configured" ok={s.addressConfigured} />
              <CheckRow label="Network verified" ok={s.networkVerified} />
              <CheckRow label="Contract code verified" ok={s.contractCodeVerified} />
              <CheckRow label="ABI configured" ok={s.abiConfigured} note="Not configured" />
              <CheckRow label="Wallet connected" ok={s.walletConnected} note="Not connected" />
              <CheckRow label="Contract interaction enabled" ok={s.contractInteractionEnabled} note="Disabled" />
            </ul>
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-secondary p-4 text-sm">
              <Wallet className="h-5 w-5 shrink-0 text-muted-foreground" />
              Wallet connection unavailable until network configuration is complete.
            </div>
          </Card>
        </div>
      </Section>

      <Section tone="muted" id="ecosystem">
        <SectionHeading eyebrow="Token utility" title="Potential use cases">Each feature is labeled with its real status. Nothing below is live yet.</SectionHeading>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={<Car className="h-5 w-5" />} title="Eligible ride payments" badge={<StatusPill status="Planned" />}>Pay for eligible rides with RIDE Token once integrated.</FeatureCard>
          <FeatureCard icon={<Gift className="h-5 w-5" />} title="Mobility rewards" badge={<StatusPill status="Planned" />}>Rewards tied to backend-verified completed trips.</FeatureCard>
          <FeatureCard icon={<Coins className="h-5 w-5" />} title="Driver incentives" badge={<StatusPill status="Planned" />}>Incentives for eligible driver activity.</FeatureCard>
          <FeatureCard icon={<Handshake className="h-5 w-5" />} title="Partner integrations" badge={<StatusPill status="Unavailable" />}>Utility with ecosystem partners.</FeatureCard>
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Roadmap" title="Proposed development phases">These are proposed phases, not completed milestones.</SectionHeading>
        <ol className="grid gap-4 md:grid-cols-4">
          {["Website and mobility experience", "Booking and driver-service integrations", "Verified token utility integrations", "Expanded partner ecosystem"].map((p, i) => (
            <li key={p} className="rounded-2xl border border-border p-6"><span className="text-sm font-bold text-primary">Phase {i + 1}</span><p className="mt-2 font-semibold">{p}</p><p className="mt-3 text-xs text-muted-foreground">Proposed</p></li>
          ))}
        </ol>
      </Section>

      <Section tone="muted">
        <SectionHeading title="Token FAQ" />
        <Faq items={[
          { q: "What is RIDE Token?", a: "A planned digital token intended to add utility — like eligible payments and incentives — to the RIDE TOKENS mobility ecosystem." },
          { q: "What is the supplied DApp contract address?", a: <>The project owner supplied <code className="break-all font-mono">{d.contractAddress}</code>. Its contract type has not yet been independently verified.</> },
          { q: "Which network is supported?", a: `Not yet verified. Owner branding references ${d.ownerIndicatedNetwork}; this will be confirmed before any wallet features are enabled.` },
          { q: "Are token rewards available?", a: "No. Rewards are planned and not live." },
          { q: "Is a wallet required to book rides?", a: "No. Booking never requires a wallet." },
          { q: "How can I verify official contract information?", a: "Only trust the address shown on this page and official RIDE TOKENS channels. Never share your seed phrase or private key with anyone." },
        ]} />
        <p className="mt-6 text-sm text-muted-foreground">Nothing on this page is investment advice. RIDE Token carries no promise of returns or price appreciation.</p>
      </Section>
    </PageShell>
  );
}
