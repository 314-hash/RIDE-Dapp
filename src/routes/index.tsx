import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Car,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Coins,
  Navigation,
  Star,
  Activity,
  CheckCircle,
  TrendingUp,
  Percent,
  Award,
  Sparkles,
  Users,
  Compass,
} from "lucide-react";
import { PageShell } from "@/components/site/Layout";
import { InteractiveMap } from "@/components/site/InteractiveMap";
import { btn } from "@/components/site/ui";
import { fetchSidraBlockHeight, SIDRA_CHAIN_CONFIG } from "@/lib/web3";
import { INITIAL_NEARBY_DRIVERS } from "@/lib/rideStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RIDE TOKENS — Smart Mobility & Ride Booking" },
      {
        name: "description",
        content:
          "Next-generation mobility platform combining convenient ride-hailing, flexible fare bidding, and Sidra Chain RIDE token utility.",
      },
      { property: "og:title", content: "RIDE TOKENS — Every Ride Connects Us" },
      {
        property: "og:description",
        content: "Smart mobility, live GPS tracking, and digital token rewards on Sidra Chain.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [blockHeight, setBlockHeight] = useState<number>(1894200);
  const [quickPickup, setQuickPickup] = useState("Greenbelt 5, Makati");
  const [quickDropoff, setQuickDropoff] = useState("BGC High Street, Taguig");

  useEffect(() => {
    fetchSidraBlockHeight().then(setBlockHeight);
    const interval = setInterval(() => {
      fetchSidraBlockHeight().then(setBlockHeight);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PageShell>
      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-card via-background to-secondary/30 py-16 sm:py-24">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="container-page relative z-10">
          <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
            {/* Left Column: Headline & Quick Booking Launcher */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-600 mb-6">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Sidra Chain Mobility Network • Block #{blockHeight.toLocaleString()}
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground">
                Your Journey. <br />
                Your Choice. <br />
                <span className="text-primary">Your Ride.</span>
              </h1>

              <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-xl">
                RIDE TOKENS connects passengers with verified drivers through convenient ride-booking,
                flexible InDrive-style fare offers, live GPS tracking, and practical blockchain utility on Sidra Chain.
              </p>

              {/* Quick Route Launcher Box */}
              <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-soft max-w-xl">
                <div className="space-y-3">
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-500" />
                    <input
                      type="text"
                      value={quickPickup}
                      onChange={(e) => setQuickPickup(e.target.value)}
                      placeholder="Pickup location..."
                      className="field pl-10 text-sm font-semibold"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-rose-500" />
                    <input
                      type="text"
                      value={quickDropoff}
                      onChange={(e) => setQuickDropoff(e.target.value)}
                      placeholder="Destination location..."
                      className="field pl-10 text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    <Coins className="h-4 w-4" />
                    <span>Pay with RIDE for 15% discount</span>
                  </div>
                  <Link
                    to="/book"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover shadow transition-all"
                  >
                    <span>View Rates & Drivers</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Secondary CTA buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/drive" className="rounded-2xl border border-border bg-secondary hover:bg-accent px-5 py-2.5 text-xs font-bold text-foreground transition-colors flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" /> Become a Driver
                </Link>
                <Link to="/token" className="rounded-2xl border border-border bg-secondary hover:bg-accent px-5 py-2.5 text-xs font-bold text-foreground transition-colors flex items-center gap-2">
                  <Coins className="h-4 w-4 text-cyan-500" /> Inspect RIDE Token
                </Link>
              </div>
            </div>

            {/* Right Column: Interactive Map Widget Preview */}
            <div className="space-y-4">
              <InteractiveMap heightClass="h-[440px] sm:h-[480px]" nearbyDrivers={INITIAL_NEARBY_DRIVERS} />
              <div className="flex items-center justify-between rounded-2xl border border-border bg-card/80 px-4 py-2.5 text-xs text-muted-foreground backdrop-blur">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Compass className="h-3.5 w-3.5 text-primary" /> Live Radar Active
                </span>
                <span className="font-mono text-cyan-600 font-bold">5 nearby drivers ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NETWORK METRICS COUNTER */}
      <section className="border-b border-border bg-secondary/50 py-10">
        <div className="container-page">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-foreground">140+</p>
              <p className="text-xs font-bold uppercase text-muted-foreground mt-1">Verified Active Drivers</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-foreground">18,940</p>
              <p className="text-xs font-bold uppercase text-muted-foreground mt-1">Completed Journeys</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-cyan-600 dark:text-cyan-400">94,520</p>
              <p className="text-xs font-bold uppercase text-muted-foreground mt-1">RIDE Tokens Rewarded</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-emerald-600">99.8%</p>
              <p className="text-xs font-bold uppercase text-muted-foreground mt-1">Safety & Satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* CORE PLATFORM FEATURES (KEY FEATURES LIST) */}
      <section className="py-16 sm:py-24">
        <div className="container-page space-y-12">
          <div className="max-w-2xl">
            <p className="eyebrow">Connected Mobility</p>
            <h2 className="text-3xl font-extrabold sm:text-4xl mt-1">
              Engineered for Passengers, Drivers, and Partners
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Inspired by modern ride-hailing platforms and augmented with transparent blockchain settlement.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:shadow-lift transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                <Car className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Ride Booking</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Book rides quickly and conveniently across Standard, Comfort, XL SUVs, Eco EVs, and Express Two-Wheelers.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:shadow-lift transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Driver Matching</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Connect passengers with nearby available drivers in seconds using intelligent proximity radar.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:shadow-lift transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-4">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Flexible Fare Offers</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Propose your own fare offer or accept driver counter-bids where supported, ensuring fair, transparent pricing.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:shadow-lift transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 mb-4">
                <Navigation className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Real-Time Tracking</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Follow driver arrival, route navigation, and trip progress in real-time with simulated GPS coordinates.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:shadow-lift transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 mb-4">
                <Coins className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Multiple Payment Options</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Support for cashless cards, Cash, Sidra SDA coin, and RIDE tokens with instant 15% discount benefits.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:shadow-lift transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Safety Features</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                24/7 Emergency SOS, share live trip links, audio recording, and driver credential verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RIDE TOKEN UTILITY SPOTLIGHT */}
      <section className="border-y border-border bg-card py-16 sm:py-20">
        <div className="container-page">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="eyebrow text-cyan-600">Sidra Chain Utility</p>
              <h2 className="text-3xl font-extrabold sm:text-4xl mt-1 text-foreground">
                Connecting Everyday Mobility with Digital Value
              </h2>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                The RIDE Token (<code className="font-mono text-xs font-bold text-primary">{SIDRA_CHAIN_CONFIG.rideTokenAddress.slice(0, 10)}...</code>)
                adds tangible utility to the ecosystem — rewarding completed rides, lowering platform commissions,
                and enabling transparent settlement.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-secondary/70 p-4 border border-border">
                  <div className="flex items-center gap-3">
                    <Percent className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-bold text-sm text-foreground">15% Ride Fare Discount</p>
                      <p className="text-xs text-muted-foreground">Automatic discount when paying with RIDE</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600">Active</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-secondary/70 p-4 border border-border">
                  <div className="flex items-center gap-3">
                    <Award className="h-5 w-5 text-cyan-500" />
                    <div>
                      <p className="font-bold text-sm text-foreground">Ride-to-Earn Rewards</p>
                      <p className="text-xs text-muted-foreground">Earn 1.5 RIDE on every verified completed kilometer</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600">Active</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-secondary/70 p-4 border border-border">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-bold text-sm text-foreground">Driver Staking Perks</p>
                      <p className="text-xs text-muted-foreground">Commission discounts down to 2% and dispatch priority</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600">Active</span>
                </div>
              </div>

              <div className="mt-8">
                <Link to="/token" className="rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover shadow inline-flex items-center gap-2">
                  <span>Explore RIDE Token DApp</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Token Card Graphic */}
            <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl" />

              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <img
                      src="/ride-token-logo.jpg"
                      alt="RIDE TOKEN on Sidra Chain logo"
                      className="h-16 w-16 rounded-2xl object-cover ring-2 ring-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.4)] shrink-0"
                    />
                    <div>
                      <h4 className="font-extrabold text-lg text-white">RIDE TOKEN</h4>
                      <p className="text-xs text-purple-400 font-mono font-bold">ON SIDRA CHAIN (97453)</p>
                    </div>
                  </div>
                  <Coins className="h-8 w-8 text-purple-400 shrink-0" />
                </div>

                <div className="py-4 border-y border-white/10 space-y-1">
                  <p className="text-xs uppercase text-slate-400 font-semibold">Contract Address</p>
                  <p className="font-mono text-xs text-white break-all">{SIDRA_CHAIN_CONFIG.rideTokenAddress}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">DEX WSDA Pool</span>
                    <p className="font-mono text-cyan-300 truncate">{SIDRA_CHAIN_CONFIG.ridePoolAddress}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Decimals & Standard</span>
                    <p className="font-semibold text-white">18 Decimals • ERC-20</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 p-4 border border-white/10 text-xs text-slate-300">
                  “To make transportation more accessible, transparent, and rewarding by combining ride-hailing technology with a practical digital-token ecosystem.”
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION BANNER */}
      <section className="bg-gradient-to-r from-primary via-blue-600 to-indigo-700 py-16 text-white text-center">
        <div className="container-page max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-200 mb-2">Our Mission</p>
          <blockquote className="text-2xl font-bold sm:text-3xl leading-snug">
            “To make transportation more accessible, transparent, and rewarding by combining ride-hailing technology with a practical digital-token ecosystem.”
          </blockquote>
          <p className="mt-4 text-sm text-cyan-100 font-semibold tracking-wide">
            RIDE TOKENS — Every Ride Connects Us
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/book" className="rounded-2xl bg-white text-primary px-6 py-3 text-xs font-bold shadow hover:bg-slate-100 transition-colors">
              Book a Ride
            </Link>
            <Link to="/drive" className="rounded-2xl border border-white/40 bg-white/10 hover:bg-white/20 text-white px-6 py-3 text-xs font-bold transition-colors">
              Join as a Driver
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
