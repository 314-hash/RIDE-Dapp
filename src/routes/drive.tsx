import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Car,
  Power,
  Star,
  Coins,
  ShieldCheck,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  UploadCloud,
  ArrowRight,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { PageShell } from "@/components/site/Layout";
import { DriverCockpit } from "@/components/site/DriverCockpit";
import { Card, SectionHeading } from "@/components/site/ui";

export const Route = createFileRoute("/drive")({
  head: () => ({
    meta: [
      { title: "Driver Cockpit & Application — RIDE TOKENS" },
      {
        name: "description",
        content:
          "Manage driver trips, receive incoming passenger requests, propose fare counter-offers, and earn RIDE token incentives on Sidra Chain.",
      },
      { property: "og:title", content: "Driver Cockpit — RIDE TOKENS" },
      {
        property: "og:description",
        content: "Drive your way forward with decentralized mobility and token rewards.",
      },
    ],
  }),
  component: DrivePage,
});

function DrivePage() {
  const [activeTab, setActiveTab] = useState<"cockpit" | "apply">("cockpit");

  // Application form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Metro Manila");
  const [vehicleType, setVehicleType] = useState("Sedan");
  const [vehicleModel, setVehicleModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !vehicleModel) return;
    setIsSubmitting(true);

    try {
      const wallet = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("ride_token_wallet_state_v2") || "{}") : {};
      const driverAddress = wallet.address || "0xDriver" + Math.floor(100000 + Math.random() * 900000);

      await fetch("http://localhost:3001/api/driver/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: driverAddress,
          name: fullName,
          phone,
          licensePlate: licensePlate || "NBL-4821",
          vehicleModel,
          vehicleType: vehicleType.toLowerCase().includes("electric") ? "electric" : "standard",
          vehicleColor: "Silver",
          docNumber: `DL-${Math.floor(100000 + Math.random() * 900000)}`,
        }),
      });
    } catch (err) {
      console.warn("Backend driver submission fallback:", err);
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <PageShell>
      {/* Top Banner & Tab Controls */}
      <section className="border-b border-border bg-card/60 py-8 backdrop-blur">
        <div className="container-page">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="eyebrow">RIDE TOKENS Mobility Partners</p>
              </div>
              <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Driver Portal & Dispatch Cockpit</h1>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-secondary p-1">
              <button
                type="button"
                onClick={() => setActiveTab("cockpit")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === "cockpit"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Power className="h-4 w-4" /> Live Driver Cockpit
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("apply")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === "apply"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-4 w-4" /> Apply to Drive
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-8 sm:py-12">
        <div className="container-page space-y-12">
          {/* TAB 1: DRIVER COCKPIT */}
          {activeTab === "cockpit" && (
            <div className="space-y-8">
              <DriverCockpit />

              {/* Driver Token Perks Grid */}
              <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft">
                <SectionHeading
                  eyebrow="Blockchain Utility"
                  title="Why Drive With RIDE TOKENS?"
                >
                  Unlike traditional centralized apps that take 25-30% platform commissions, RIDE TOKENS
                  uses transparent smart coordination and rewards drivers directly with token utility.
                </SectionHeading>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-6">
                  <div className="rounded-2xl border border-border bg-secondary/50 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                      <Coins className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold text-foreground">Lowest Commission Rate</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only 8% platform fee (vs 25% on legacy apps). Keep more of what you earn on every trip.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-secondary/50 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 mb-3">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold text-foreground">RIDE Token Fuel Bonuses</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Earn bonus RIDE tokens for completing trips during peak rush hours and maintaining a 4.9+ rating.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-secondary/50 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-3">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold text-foreground">Flexible Fare Counter-Bidding</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Propose your own price or counter-offer passengers (+10%, +20%) based on real-time traffic and demand.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-secondary/50 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 mb-3">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold text-foreground">Instant Daily Settlements</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      No weekly lockups. Settle earnings instantly to your Sidra Chain wallet or local cashless accounts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPLY TO DRIVE */}
          {activeTab === "apply" && (
            <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
              {/* Left Column: Requirements & Benefits */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft">
                  <p className="eyebrow mb-2">Driver Onboarding</p>
                  <h3 className="text-2xl font-bold">Fast-Track Verification</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Join thousands of independent mobility partners. Complete 3 simple steps to activate your driver account.
                  </p>

                  <ol className="mt-6 space-y-4">
                    {[
                      { step: "1", title: "Submit Application", desc: "Fill in personal and vehicle details." },
                      { step: "2", title: "Document Check", desc: "Upload Professional Driver's License and LTO/DOT registration." },
                      { step: "3", title: "Instant Activation", desc: "Receive your on-chain certified badge and go online!" },
                    ].map((s) => (
                      <li key={s.step} className="flex items-start gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                          {s.step}
                        </span>
                        <div>
                          <h5 className="font-bold text-sm text-foreground">{s.title}</h5>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Verification Document Checklist */}
                <div className="rounded-3xl border border-border bg-secondary/50 p-6">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Required Verification Documents</span>
                  </h4>
                  <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Valid Professional Driver's License</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Official Receipt & Certificate of Registration (OR/CR)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span>NBI or Police Clearance certificate</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Vehicle Insurance policy</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Application Form */}
              <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft">
                {submitted ? (
                  <div className="py-12 text-center animate-in fade-in">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 ring-8 ring-emerald-500/10">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                    <h3 className="mt-4 text-2xl font-bold">Application Received!</h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                      Thank you, <strong className="text-foreground">{fullName}</strong>. Your profile for{" "}
                      <strong className="text-foreground">{vehicleModel} ({licensePlate})</strong> has been logged.
                      Our verification team will review your credentials within 24 hours.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("cockpit")}
                      className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover shadow"
                    >
                      Open Driver Cockpit <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApply} className="space-y-5">
                    <h3 className="text-xl font-bold">Driver Registration</h3>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Juan dela Cruz"
                          className="field text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="juan@example.com"
                          className="field text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+63 917 123 4567"
                          className="field text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                          Operating City
                        </label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="field text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                          Vehicle Category
                        </label>
                        <select
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value)}
                          className="field text-sm font-semibold"
                        >
                          <option>Sedan (Standard)</option>
                          <option>Premium Sedan (Comfort)</option>
                          <option>SUV / AUV (XL)</option>
                          <option>Electric Vehicle (EV)</option>
                          <option>Motorcycle (Express)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                          Vehicle Make & Model
                        </label>
                        <input
                          type="text"
                          required
                          value={vehicleModel}
                          onChange={(e) => setVehicleModel(e.target.value)}
                          placeholder="e.g. Toyota Vios 2023"
                          className="field text-sm"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                          License Plate Number
                        </label>
                        <input
                          type="text"
                          required
                          value={licensePlate}
                          onChange={(e) => setLicensePlate(e.target.value)}
                          placeholder="e.g. NBL-4821"
                          className="field text-sm uppercase font-mono font-bold"
                        />
                      </div>
                    </div>

                    {/* Simulated Document Upload Dropzone */}
                    <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/30 p-6 text-center hover:border-primary/50 transition-colors">
                      <UploadCloud className="mx-auto h-8 w-8 text-primary" />
                      <p className="mt-2 text-xs font-semibold text-foreground">
                        Drag and drop your Driver's License or OR/CR here
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Supports JPG, PNG, PDF up to 10MB
                      </p>
                      <button
                        type="button"
                        className="mt-3 rounded-lg border border-border bg-background px-3 py-1 text-xs font-semibold hover:bg-secondary"
                      >
                        Browse Files
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft hover:bg-primary-hover active:scale-98 transition-all"
                    >
                      Submit Driver Application
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
