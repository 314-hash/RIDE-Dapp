import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Car, Eye, MapPin, Network, ClipboardList, Navigation, Coins, UserRound, Steering } from "@/components/site/icons";
import { PageShell } from "@/components/site/Layout";
import { HeroVideo } from "@/components/site/HeroVideo";
import { FeatureCard, Section, SectionHeading, StatusPill, btn } from "@/components/site/ui";
import { appConfig } from "@/config/app";
import heroVideo from "@/assets/ride-hero.mp4.asset.json";
import heroPoster from "@/assets/ride-hero-poster.jpg.asset.json";
import logo from "@/assets/ride-token-logo.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RIDE TOKENS — Every Ride Connects Us" },
      { name: "description", content: "Smart mobility connecting passengers, drivers and partners through ride booking and an evolving digital-token ecosystem." },
      { property: "og:title", content: "RIDE TOKENS — Every Ride Connects Us" },
      { property: "og:description", content: "Smart mobility. Connected future. Book rides, drive with us, and explore the RIDE Token." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <PageShell>
      <section className="relative isolate overflow-hidden">
        <HeroVideo src={heroVideo.url} poster={heroPoster.url} />
        <div className="hero-overlay absolute inset-0" aria-hidden />
        <div className="container-page relative flex min-h-[88vh] flex-col justify-center py-24 text-ink-foreground">
          <p className="eyebrow mb-5">Smart Mobility. Connected Future.</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">Your Journey. Your Choice. Your Ride.</h1>
          <p className="mt-6 max-w-xl text-lg text-ink-foreground/80">
            Discover a smarter way to move. RIDE TOKENS brings passengers, drivers, and mobility partners together through convenient ride-booking experiences and an evolving digital-token ecosystem.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/book" className={btn.primary}>Book a Ride <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/drive" className={btn.light}>Become a Driver</Link>
            <Link to="/token" className={btn.ghostDark}>Explore RIDE Token</Link>
          </div>
        </div>
      </section>

      <Section>
        <SectionHeading eyebrow="Why RIDE TOKENS" title="Moving People Forward" />
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard icon={<Car className="h-5 w-5" />} title="Convenient Rides">A streamlined experience for requesting and managing journeys.</FeatureCard>
          <FeatureCard icon={<Eye className="h-5 w-5" />} title="Transparent Mobility">Clear trip details and ride records where supported.</FeatureCard>
          <FeatureCard icon={<Network className="h-5 w-5" />} title="Connected Ecosystem">A mobility platform designed to connect passengers, drivers, and digital utility.</FeatureCard>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading eyebrow="How it works" title="Three simple steps">
          Live dispatch and tracking are not yet connected — the booking page currently runs as a labeled demonstration.
        </SectionHeading>
        <ol className="grid gap-6 md:grid-cols-3">
          {[
            { i: MapPin, t: "Enter your pickup and destination." },
            { i: ClipboardList, t: "Review available ride details." },
            { i: Navigation, t: "Follow your trip using supported tracking features." },
          ].map((s, idx) => (
            <li key={s.t} className="rounded-2xl bg-card p-6 shadow-soft">
              <span className="text-5xl font-bold text-primary/20">0{idx + 1}</span>
              <s.i className="mt-2 h-6 w-6 text-primary" aria-hidden />
              <p className="mt-3 text-lg font-semibold">{s.t}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-secondary p-8 sm:p-10">
            <UserRound className="h-8 w-8 text-primary" aria-hidden />
            <h3 className="mt-5 text-2xl font-bold">For passengers</h3>
            <p className="mt-3 text-muted-foreground">Plan a trip with pickup, stops, ride category and your preferred payment option — all in one clear form.</p>
            <Link to="/book" className={`${btn.primary} mt-8`}>Plan a ride <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="rounded-3xl bg-ink p-8 text-ink-foreground sm:p-10">
            <Steering className="h-8 w-8 text-primary" aria-hidden />
            <h3 className="mt-5 text-2xl font-bold">For drivers</h3>
            <p className="mt-3 text-ink-foreground/75">Register your interest in driving with RIDE TOKENS and learn how onboarding is planned to work.</p>
            <Link to="/drive" className={`${btn.light} mt-8`}>Drive with us <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </Section>

      <Section tone="muted">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">RIDE Token</p>
            <h2 className="text-3xl font-bold sm:text-4xl">Digital utility, built around real journeys</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              The RIDE Token is intended to add practical utility to the mobility ecosystem — such as eligible payments and incentives. These features are not live yet.
            </p>
            <ul className="mt-6 space-y-3">
              {["Eligible ride payments", "Mobility rewards", "Driver incentives"].map((f) => (
                <li key={f} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 shadow-soft">
                  <span className="flex items-center gap-2 font-medium"><Coins className="h-4 w-4 text-primary" />{f}</span>
                  <StatusPill status="Planned" />
                </li>
              ))}
            </ul>
            <Link to="/token" className={`${btn.secondary} mt-8`}>Explore RIDE Token</Link>
          </div>
          <img src={logo.url} alt="RIDE Token logo" loading="lazy" className="mx-auto w-full max-w-md rounded-3xl shadow-lift" />
        </div>
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow mb-4">Our mission</p>
          <blockquote className="text-2xl font-semibold leading-snug sm:text-3xl">“{appConfig.mission}”</blockquote>
        </div>
      </Section>

      <section className="bg-primary py-16 text-primary-foreground sm:py-20">
        <div className="container-page flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Your Next Journey Starts Here.</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/book" className={btn.light}>Book a Ride</Link>
            <Link to="/drive" className={btn.ghostDark}>Join as a Driver</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
