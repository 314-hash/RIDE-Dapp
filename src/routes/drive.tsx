import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { CalendarClock, ClipboardList, Coins, UserRound } from "@/components/site/icons";
import { PageShell } from "@/components/site/Layout";
import { Card, DemoBanner, Faq, FeatureCard, Field, Section, SectionHeading, btn } from "@/components/site/ui";
import { driverSchema, type DriverInput } from "@/lib/schemas";
import { driverService } from "@/services";
import { cn } from "@/lib/utils";
import driveHero from "@/assets/drive-hero.jpg";

export const Route = createFileRoute("/drive")({
  head: () => ({
    meta: [
      { title: "Drive With Us — RIDE TOKENS" },
      { name: "description", content: "Register your interest in driving with RIDE TOKENS and learn about planned driver onboarding." },
      { property: "og:title", content: "Drive With Us — RIDE TOKENS" },
      { property: "og:description", content: "Drive Your Way Forward with RIDE TOKENS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DrivePage,
});

function DrivePage() {
  const [result, setResult] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DriverInput>({ resolver: zodResolver(driverSchema) as never });
  const onSubmit = async (d: DriverInput) => {
    const r = await driverService.submitApplication(d);
    setResult(r.mode === "error" ? r.message : r.mode === "demo" ? r.message : "Application received.");
    reset();
  };
  const err = (k: keyof DriverInput) => errors[k]?.message as string | undefined;
  const a = (k: keyof DriverInput) => ({ id: k, "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  return (
    <PageShell>
      <section className="relative isolate overflow-hidden bg-ink">
        <img src={driveHero} alt="White electric car with its door open on a city street at dusk" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover" />
        <div className="hero-overlay absolute inset-0" aria-hidden />
        <div className="container-page relative flex min-h-[70vh] flex-col justify-center py-20 text-ink-foreground">
          <p className="eyebrow mb-4">Drive with us</p>
          <h1 className="max-w-2xl text-4xl font-bold sm:text-6xl">Drive Your Way Forward.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-foreground/80">Connect with a mobility ecosystem built around convenient journeys, transparent trip information, and opportunities for drivers.</p>
          <a href="#apply" className={`${btn.primary} mt-8 self-start`}>Apply to Drive</a>
        </div>
      </section>

      <Section>
        <SectionHeading eyebrow="Platform goals" title="What we're building for drivers">These are goals and potential benefits — not guarantees of income, bookings or commission rates.</SectionHeading>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={<CalendarClock className="h-5 w-5" />} title="Flexible opportunities">Drive when it suits you, where the service operates.</FeatureCard>
          <FeatureCard icon={<ClipboardList className="h-5 w-5" />} title="Clear trip & fare info">Understand trip details before you accept them.</FeatureCard>
          <FeatureCard icon={<UserRound className="h-5 w-5" />} title="Profile & trip tools">Manage your driver profile and trip history.</FeatureCard>
          <FeatureCard icon={<Coins className="h-5 w-5" />} title="Token incentives">Potential eligible digital-token incentives (planned).</FeatureCard>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading eyebrow="Onboarding" title="How onboarding is planned to work">Eligibility and activation depend on the actual operating process in your area.</SectionHeading>
        <ol className="grid gap-4 md:grid-cols-4">
          {["Submit your interest.", "Provide required information.", "Complete verification.", "Activate your driver account."].map((s, i) => (
            <li key={s} className="rounded-2xl bg-card p-6 shadow-soft"><span className="text-sm font-bold text-primary">Step {i + 1}</span><p className="mt-2 font-semibold">{s}</p></li>
          ))}
        </ol>
      </Section>

      <Section id="apply">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <SectionHeading eyebrow="Apply" title="Register your interest" />
            <DemoBanner><strong>Simulated form.</strong> In demo mode nothing you type is sent or stored. Never share identity documents through this form.</DemoBanner>
          </div>
          <Card>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
              <Field id="fullName" label="Full name" error={err("fullName")}><input className="field" autoComplete="name" {...a("fullName")} {...register("fullName")} /></Field>
              <Field id="email" label="Email" error={err("email")}><input type="email" className="field" autoComplete="email" {...a("email")} {...register("email")} /></Field>
              <Field id="phone" label="Phone" error={err("phone")}><input type="tel" className="field" autoComplete="tel" {...a("phone")} {...register("phone")} /></Field>
              <Field id="city" label="Operating city" error={err("city")}><input className="field" {...a("city")} {...register("city")} /></Field>
              <Field id="vehicleType" label="Vehicle type" error={err("vehicleType")}>
                <select className="field" defaultValue="" {...a("vehicleType")} {...register("vehicleType")}>
                  <option value="" disabled>Select…</option><option>Sedan</option><option>Hatchback</option><option>SUV</option><option>Van</option><option>Motorcycle</option>
                </select>
              </Field>
              <Field id="vehicleModel" label="Vehicle model" error={err("vehicleModel")}><input className="field" placeholder="e.g. Toyota Vios 2022" {...a("vehicleModel")} {...register("vehicleModel")} /></Field>
              <div className="sm:col-span-2"><Field id="message" label="Message (optional)" error={err("message")}><textarea rows={3} className="field" {...a("message")} {...register("message")} /></Field></div>
              <div className="sm:col-span-2">
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" {...a("consent")} {...register("consent")} />
                  <span>I agree that RIDE TOKENS may contact me about driving opportunities, per the Privacy Policy.</span>
                </label>
                {err("consent") && <p id="consent-error" role="alert" className="mt-1 text-sm text-destructive">{err("consent")}</p>}
              </div>
              <button type="submit" disabled={isSubmitting} className={cn(btn.primary, "sm:col-span-2")}>Submit interest</button>
              {result && <p role="status" className="rounded-lg bg-warning/10 p-3 text-sm font-medium sm:col-span-2">{result}</p>}
            </form>
          </Card>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading title="Driver FAQ" />
        <Faq items={[
          { q: "What are the application requirements?", a: "Requirements haven't been finalised and will depend on local regulations where the service operates." },
          { q: "How does driver verification work?", a: "Verification steps will be published before activation begins. Documents will only ever be requested through a secure process." },
          { q: "How are fares calculated?", a: "Fare calculation has not been finalised. No fare rules are active yet." },
          { q: "When are drivers paid?", a: "Payment timing will be confirmed once a payment provider is integrated." },
          { q: "Do I need RIDE Token to drive?", a: "No token requirement has been announced. Token incentives are planned, not live." },
        ]} />
      </Section>
    </PageShell>
  );
}
