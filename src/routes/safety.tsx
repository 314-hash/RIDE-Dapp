import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  PhoneCall,
  Share2,
  Mic,
  Search,
  CheckCircle,
  AlertTriangle,
  Lock,
  UserCheck,
  Car,
  Headphones,
} from "lucide-react";
import { PageShell } from "@/components/site/Layout";
import { SectionHeading } from "@/components/site/ui";
import { SafetyCenterModal } from "@/components/site/SafetyCenterModal";
import { loadSafetySettings } from "@/lib/rideStore";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety Center — RIDE TOKENS Smart Mobility" },
      {
        name: "description",
        content:
          "24/7 Safety toolkit, SOS emergency dispatch, driver credential verification, and live trip tracking protection on RIDE TOKENS.",
      },
      { property: "og:title", content: "Safety Center — RIDE TOKENS" },
      {
        property: "og:description",
        content: "Every ride connects us safely with transparent security features.",
      },
    ],
  }),
  component: SafetyPage,
});

export function SafetyPage() {
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [searchPlate, setSearchPlate] = useState("");
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const safetySettings = loadSafetySettings();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPlate.trim()) return;
    const found = safetySettings.driverVerificationDatabase.find(
      (d) =>
        d.plate.toLowerCase().includes(searchPlate.toLowerCase().trim()) ||
        d.driverName.toLowerCase().includes(searchPlate.toLowerCase().trim())
    );
    setSearchResult(found || "not_found");
  };

  return (
    <PageShell>
      {/* Hero Header */}
      <section className="border-b border-border bg-gradient-to-b from-card to-background py-16 sm:py-20">
        <div className="container-page text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-500 mb-4 ring-8 ring-emerald-500/10">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <p className="eyebrow text-emerald-600">Safety First, Always</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">RIDE TOKENS Safety Center</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Your safety and peace of mind are built into every part of our platform — from driver verification
            and in-trip GPS monitoring to 24/7 SOS assistance.
          </p>

          <div className="mt-8 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setSafetyModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-destructive px-6 py-3.5 text-sm font-bold text-destructive-foreground shadow hover:bg-destructive/90 transition-all"
            >
              <ShieldAlert className="h-4 w-4" /> Open 24/7 Emergency SOS Toolkit
            </button>
            <Link
              to="/book"
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-6 py-3.5 text-sm font-bold text-foreground hover:bg-secondary transition-all"
            >
              <Car className="h-4 w-4 text-primary" /> Book a Protected Ride
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 sm:py-16">
        <div className="container-page space-y-16">
          {/* 4 Pillars of Safety */}
          <div>
            <SectionHeading eyebrow="Comprehensive Protection" title="How We Keep Every Journey Secure" center />

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-8">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-4">
                  <UserCheck className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-lg text-foreground">100% Verified Drivers</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Every driver undergoes multi-step verification including Professional Driver's License checks,
                  vehicle roadworthiness inspection, and police background clearance.
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 mb-4">
                  <Share2 className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-lg text-foreground">Share Live Trip Link</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Share your real-time journey progress, driver details, and live GPS map location with family
                  or friends via a secure one-click shareable link.
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mb-4">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-lg text-foreground">Emergency SOS Button</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Instant one-tap SOS alerts our 24/7 security dispatch center, transmits your exact GPS coordinates,
                  and notifies your saved emergency contacts immediately.
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                  <Lock className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-lg text-foreground">Encrypted Data & Privacy</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Your phone number and exact personal info are protected. We never sell user data or expose
                  private financial credentials.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Driver Verification Lookup */}
          <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
            <div className="max-w-2xl mx-auto text-center">
              <SectionHeading
                eyebrow="Verification Database"
                title="Verify Driver Plate & Certification"
                center
              >
                Before boarding any vehicle, you can cross-reference the license plate with our certified registry.
              </SectionHeading>

              <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
                <input
                  type="text"
                  placeholder="Enter plate number (e.g. NBL-4821 or Carlos)..."
                  value={searchPlate}
                  onChange={(e) => setSearchPlate(e.target.value)}
                  className="flex-1 field text-sm"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover shadow flex items-center justify-center gap-2"
                >
                  <Search className="h-4 w-4" /> Verify Credentials
                </button>
              </form>

              {searchResult && searchResult !== "not_found" && (
                <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-left animate-in fade-in max-w-lg mx-auto">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">{searchResult.driverName}</p>
                      <p className="font-mono text-xs text-muted-foreground">Plate: {searchResult.plate}</p>
                    </div>
                    <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                      {searchResult.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-emerald-500/20 pt-3">
                    <div>
                      <span className="text-muted-foreground">Safety Score:</span>
                      <p className="font-bold text-emerald-600">{searchResult.safetyScore}/100 Top-Tier</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Inspection Valid:</span>
                      <p className="font-bold text-foreground">{searchResult.validUntil}</p>
                    </div>
                  </div>
                </div>
              )}

              {searchResult === "not_found" && (
                <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 animate-in fade-in max-w-lg mx-auto">
                  Plate or driver not found in the verified registry. Please confirm the exact plate or contact support.
                </div>
              )}
            </div>
          </div>

          {/* Safety Guidelines for Riders and Drivers */}
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-border bg-secondary/50 p-6 sm:p-8">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" /> Tips for Riders
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Check the plate:</strong> Always verify the driver's license plate matches your app summary before getting in.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Share your trip:</strong> Send the live tracking link to a loved one for peace of mind.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Rate honestly:</strong> Leave honest star reviews to help maintain high community standards.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-border bg-secondary/50 p-6 sm:p-8">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" /> Standards for Drivers
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Vehicle maintenance:</strong> Keep vehicles clean, serviced, and equipped with functional seatbelts.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Safe driving:</strong> Adhere to speed limits and avoid distracted mobile phone usage while in transit.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Zero tolerance:</strong> Respect passenger comfort and maintain a safe, welcoming environment.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <SafetyCenterModal isOpen={safetyModalOpen} onClose={() => setSafetyModalOpen(false)} />
    </PageShell>
  );
}
