import { useState, useEffect } from "react";
import {
  Phone,
  MessageSquare,
  ShieldAlert,
  Share2,
  CheckCircle,
  Coins,
  FastForward,
  Navigation,
  Car,
  Star,
  Copy,
  Check,
} from "lucide-react";
import type { ActiveTrip } from "@/lib/rideStore";

interface ActiveTripTrackerProps {
  trip: ActiveTrip;
  onAdvanceProgress: (step: number) => void;
  onCompleteTrip: () => void;
  onCancelTrip: () => void;
  onOpenSos: () => void;
}

export function ActiveTripTracker({
  trip,
  onAdvanceProgress,
  onCompleteTrip,
  onCancelTrip,
  onOpenSos,
}: ActiveTripTrackerProps) {
  const [copiedShare, setCopiedShare] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: "driver", text: "Hello! I am on my way to your pickup location.", time: "Just now" },
  ]);

  const driver = trip.matchedDriver;
  const progress = trip.progressPercent;

  // Auto tick simulation if in transit
  useEffect(() => {
    if (trip.status !== "driver_arriving" && trip.status !== "in_progress") {
      return;
    }
    const interval = setInterval(() => {
      if (progress >= 100) {
        onCompleteTrip();
      } else {
        onAdvanceProgress(Math.min(100, progress + 4));
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [trip.status, progress, onAdvanceProgress, onCompleteTrip]);

  const handleCopyShare = async () => {
    const url = `${window.location.origin}/book?share_trip=${trip.id}`;
    await navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg = { sender: "user", text: chatInput, time: "Just now" };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");

    // Simulate driver reply
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "driver",
          text: "Got it! See you shortly outside.",
          time: "Just now",
        },
      ]);
    }, 1500);
  };

  const getStatusText = () => {
    if (trip.status === "driver_arriving") {
      return progress > 60
        ? "Driver is pulling up to your pickup point!"
        : `Driver is en route to pickup (~${trip.currentEtaMinutes} mins away)`;
    }
    if (trip.status === "in_progress") {
      return progress > 85
        ? "Approaching destination. Please prepare to disembark."
        : `Heading to destination • ${Math.max(1, Math.round(trip.distanceKm * (1 - progress / 100) * 10) / 10)} km remaining`;
    }
    if (trip.status === "completed") {
      return "Trip Completed! Arrived safely at destination.";
    }
    return "Driver assigned";
  };

  return (
    <div className="space-y-6">
      {/* Real-time Progress Bar & Status Pill */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                {trip.status === "driver_arriving" ? "Driver Arriving" : "Live Trip Active"}
              </span>
            </div>
            <h3 className="mt-1 text-2xl font-black text-foreground">{getStatusText()}</h3>
          </div>

          {/* Fast-Forward Simulation Tool for instant demo */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAdvanceProgress(Math.min(100, progress + 25))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold text-foreground hover:bg-accent transition-colors"
              title="Fast forward progress for testing"
            >
              <FastForward className="h-3.5 w-3.5 text-primary" /> Advance 25%
            </button>
            <button
              type="button"
              onClick={onCompleteTrip}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Finish Trip
            </button>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-2">
            <span>Pickup: {trip.pickup.slice(0, 20)}</span>
            <span className="text-primary font-mono">{progress}% Complete</span>
            <span>Dropoff: {trip.destination.slice(0, 20)}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-primary transition-all duration-500 shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* RIDE Token Rewards Tracker Banner */}
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-cyan-500/10 border border-cyan-500/20 px-4 py-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-cyan-600 dark:text-cyan-400">
            <Coins className="h-4 w-4" />
            <span>Ride-to-Earn Rewards:</span>
            <span className="font-mono font-bold">+{trip.earnedRideRewards || 8.5} RIDE Tokens</span>
          </div>
          <span className="text-muted-foreground">Credited upon trip completion</span>
        </div>
      </div>

      {/* Driver Card & Direct Communication Controls */}
      {driver && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Driver Profile */}
            <div className="flex items-center gap-4">
              <img
                src={driver.avatarUrl}
                alt={driver.name}
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-primary/30"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-bold">{driver.name}</h4>
                  <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    {driver.rating.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground/80 mt-0.5">
                  {driver.color} {driver.vehicleModel}
                </p>
                <div className="mt-1 inline-flex items-center rounded-lg border border-border bg-secondary px-2.5 py-0.5 font-mono text-xs font-black tracking-widest text-foreground">
                  {driver.licensePlate}
                </div>
              </div>
            </div>

            {/* Communication & Safety Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={`tel:${driver.phone}`}
                className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-xs font-bold text-foreground hover:bg-accent transition-colors"
              >
                <Phone className="h-4 w-4 text-emerald-500" /> Call Driver
              </a>

              <button
                type="button"
                onClick={() => setChatOpen(!chatOpen)}
                className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-xs font-bold text-foreground hover:bg-accent transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-primary" /> Chat
              </button>

              <button
                type="button"
                onClick={handleCopyShare}
                className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-accent transition-colors"
                title="Share Trip Link"
              >
                {copiedShare ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Share2 className="h-4 w-4 text-cyan-500" />
                )}
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={onOpenSos}
                className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 shadow transition-all"
              >
                <ShieldAlert className="h-4 w-4 animate-pulse" /> Emergency SOS
              </button>
            </div>
          </div>

          {/* In-App Chat Drawer */}
          {chatOpen && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold uppercase text-muted-foreground">In-App Chat with Driver</h5>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2.5 rounded-2xl bg-secondary/60 p-4 border border-border">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${
                        msg.sender === "user"
                          ? "bg-primary text-primary-foreground rounded-br-xs"
                          : "bg-card border border-border text-foreground rounded-bl-xs"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="mt-0.5 text-[9px] text-muted-foreground">{msg.time}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Message driver (e.g. I am in the lobby)..."
                  className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2 text-xs outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover shadow"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Trip Details Summary Card */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <h4 className="text-lg font-bold mb-4">Trip Details</h4>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted-foreground">Total Distance</dt>
            <dd className="font-semibold">{trip.distanceKm} km</dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted-foreground">Agreed Fare</dt>
            <dd className="font-black text-primary">${trip.finalFare.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted-foreground">Payment Method</dt>
            <dd className="font-semibold uppercase">{trip.paymentMethod.replace("_", " ")}</dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted-foreground">Estimated Duration</dt>
            <dd className="font-semibold">{trip.durationMinutes} mins</dd>
          </div>
        </dl>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onCancelTrip}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          >
            Cancel Trip
          </button>
        </div>
      </div>
    </div>
  );
}
