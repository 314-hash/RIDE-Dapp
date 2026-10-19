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
  MapPin,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import type { DriverPortalState, PaymentMethod } from "@/lib/rideStore";
import { loadDriverPortal } from "@/lib/rideStore";

interface DriverCockpitProps {
  onAcceptIncomingTrip?: (requestId: string) => void;
}

export function DriverCockpit({ onAcceptIncomingTrip }: DriverCockpitProps) {
  const [portal, setPortal] = useState<DriverPortalState>(() => loadDriverPortal());
  const [acceptedNotice, setAcceptedNotice] = useState<string | null>(null);

  const toggleOnline = () => {
    setPortal((prev) => {
      const next = { ...prev, isOnline: !prev.isOnline };
      localStorage.setItem("ride_token_driver_portal_v2", JSON.stringify(next));
      return next;
    });
  };

  const handleAccept = (reqId: string, passengerName: string, fare: number) => {
    setAcceptedNotice(`Accepted trip for ${passengerName} ($${fare.toFixed(2)})! Navigating to pickup.`);
    setPortal((prev) => {
      const updated = {
        ...prev,
        todayEarningsSda: prev.todayEarningsSda + 4.2,
        todayEarningsRide: prev.todayEarningsRide + 18.0,
        completedTrips: prev.completedTrips + 1,
        incomingRequests: prev.incomingRequests.filter((r) => r.id !== reqId),
      };
      localStorage.setItem("ride_token_driver_portal_v2", JSON.stringify(updated));
      return updated;
    });

    if (onAcceptIncomingTrip) {
      onAcceptIncomingTrip(reqId);
    }

    setTimeout(() => setAcceptedNotice(null), 5000);
  };

  const handleCounterOffer = (reqId: string, originalFare: number) => {
    const counter = Math.round(originalFare * 1.15 * 10) / 10;
    setAcceptedNotice(`Sent counter-offer of $${counter.toFixed(2)} to passenger! Waiting for approval.`);
    setTimeout(() => setAcceptedNotice(null), 4000);
  };

  const handleDecline = (reqId: string) => {
    setPortal((prev) => ({
      ...prev,
      incomingRequests: prev.incomingRequests.filter((r) => r.id !== reqId),
    }));
  };

  return (
    <div className="space-y-8">
      {/* Driver Status Card */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-2xl">
                AR
              </div>
              <span
                className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-card ${
                  portal.isOnline ? "bg-emerald-500" : "bg-muted-foreground"
                }`}
                title={portal.isOnline ? "Online" : "Offline"}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-foreground">{portal.driverName}</h3>
                <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  {portal.rating.toFixed(2)}
                </span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {portal.vehicleModel} •{" "}
                <span className="font-mono text-xs font-bold text-foreground">{portal.licensePlate}</span>
              </p>
            </div>
          </div>

          {/* Online Toggle Switch Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleOnline}
              className={`inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-bold shadow-soft transition-all ${
                portal.isOnline
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 ring-4 ring-emerald-500/20"
                  : "bg-secondary text-muted-foreground hover:bg-accent"
              }`}
            >
              <Power className="h-4 w-4" />
              {portal.isOnline ? "You are Online & Receiving Rides" : "You are Offline"}
            </button>
          </div>
        </div>

        {/* Accepted Alert Banner */}
        {acceptedNotice && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-sm font-semibold text-emerald-600 animate-in fade-in">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>{acceptedNotice}</span>
          </div>
        )}

        {/* Shift Earnings Summary Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-secondary/50 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Today's SDA Earnings</p>
            <p className="mt-1 text-2xl font-black text-foreground">{portal.todayEarningsSda.toFixed(2)} SDA</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">≈ ${(portal.todayEarningsSda * 2.5).toFixed(2)} USD</p>
          </div>

          <div className="rounded-2xl border border-border bg-cyan-500/5 border-cyan-500/20 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase">
              <Coins className="h-3.5 w-3.5" /> RIDE Token Incentives
            </div>
            <p className="mt-1 text-2xl font-black text-cyan-600 dark:text-cyan-400">
              +{portal.todayEarningsRide.toFixed(1)} RIDE
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Peak hour & rating bonus</p>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/50 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Completed Rides</p>
            <p className="mt-1 text-2xl font-black text-foreground">{portal.completedTrips}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total career trips</p>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/50 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Acceptance Rate</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">{portal.acceptanceRate}%</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Top-Tier Driver tier</p>
          </div>
        </div>
      </div>

      {/* Incoming Ride Requests Queue (Live Radar) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Incoming Ride Requests</h3>
            <p className="text-xs text-muted-foreground">Passengers requesting pickup near your location</p>
          </div>
          {portal.isOnline && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Radar Active
            </span>
          )}
        </div>

        {!portal.isOnline ? (
          <div className="rounded-3xl border border-border bg-card p-10 text-center">
            <Power className="mx-auto h-10 w-10 text-muted-foreground" />
            <h4 className="mt-3 font-bold text-foreground">You are currently offline</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Switch your status to Online above to start receiving ride requests.
            </p>
          </div>
        ) : portal.incomingRequests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center">
            <Car className="mx-auto h-10 w-10 text-primary animate-pulse" />
            <h4 className="mt-3 font-bold text-foreground">Searching for passenger requests...</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              You are first in queue for nearby pickups in Ortigas and BGC.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {portal.incomingRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-3xl border border-primary/30 bg-card p-6 shadow-soft hover:border-primary transition-all"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                        Passenger Request
                      </span>
                      <span className="font-bold text-foreground">{req.passengerName}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({req.distanceKm} km trip)
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Pickup: {req.pickup}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>Dropoff: {req.destination}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="text-left sm:text-right pr-2">
                      <span className="text-2xl font-black text-foreground">
                        ${req.proposedFare.toFixed(2)}
                      </span>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Paid via {req.paymentMethod.replace("_", " ")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAccept(req.id, req.passengerName, req.proposedFare)}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow transition-colors"
                      >
                        Accept Ride
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCounterOffer(req.id, req.proposedFare)}
                        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-500/20 transition-colors"
                      >
                        Counter (+15%)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDecline(req.id)}
                        className="rounded-xl border border-border px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Driver Compliance & Verification Status */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <h4 className="text-lg font-bold">Driver Credentials & Safety Verification</h4>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-4 border border-border">
            <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">Professional License</p>
              <p className="text-[11px] text-emerald-600 font-semibold">Verified & Active</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-4 border border-border">
            <CheckCircle className="h-6 w-6 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">Vehicle Roadworthiness</p>
              <p className="text-[11px] text-emerald-600 font-semibold">Passed Inspection 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-4 border border-border">
            <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">Background Clearance</p>
              <p className="text-[11px] text-emerald-600 font-semibold">Clear (NBI / Police)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
