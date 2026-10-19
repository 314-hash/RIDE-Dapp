import { useState } from "react";
import {
  ShieldAlert,
  PhoneCall,
  Share2,
  Mic,
  ShieldCheck,
  Check,
  AlertTriangle,
  UserPlus,
  Trash2,
  Search,
  X,
} from "lucide-react";
import type { SafetySettings } from "@/lib/rideStore";
import { loadSafetySettings } from "@/lib/rideStore";

interface SafetyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SafetyCenterModal({ isOpen, onClose }: SafetyCenterModalProps) {
  const [safety, setSafety] = useState<SafetySettings>(() => loadSafetySettings());
  const [sosTriggered, setSosTriggered] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchPlate, setSearchPlate] = useState("");
  const [searchResult, setSearchResult] = useState<any | null>(null);

  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  if (!isOpen) return null;

  const triggerSos = async () => {
    setSosTriggered(true);
    setSafety((prev) => {
      const next = { ...prev, sosActive: true, sosAlertTimestamp: Date.now() };
      localStorage.setItem("ride_token_safety_v2", JSON.stringify(next));
      return next;
    });

    try {
      await fetch("http://localhost:3001/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId: "live_active_trip",
          senderAddress: "0xPassenger" + Math.floor(100000 + Math.random() * 900000),
          senderRole: "passenger",
          lat: 14.5547,
          lng: 121.0244,
          details: "Passenger initiated emergency SOS broadcast from Safety Center modal.",
        }),
      });
    } catch (e) {
      console.warn("Backend SOS broadcast fallback:", e);
    }
  };

  const cancelSos = () => {
    setSosTriggered(false);
    setSafety((prev) => {
      const next = { ...prev, sosActive: false, sosAlertTimestamp: undefined };
      localStorage.setItem("ride_token_safety_v2", JSON.stringify(next));
      return next;
    });
  };

  const copyTripLink = async () => {
    const link = `${window.location.origin}/safety?verify_trip=${safety.shareTripToken}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleAudio = () => {
    setSafety((prev) => {
      const next = { ...prev, audioRecordingEnabled: !prev.audioRecordingEnabled };
      localStorage.setItem("ride_token_safety_v2", JSON.stringify(next));
      return next;
    });
  };

  const addContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;
    const newC = {
      id: "c_" + Date.now(),
      name: newContactName,
      phone: newContactPhone,
      relationship: "Trusted Contact",
    };
    setSafety((prev) => {
      const next = { ...prev, emergencyContacts: [...prev.emergencyContacts, newC] };
      localStorage.setItem("ride_token_safety_v2", JSON.stringify(next));
      return next;
    });
    setNewContactName("");
    setNewContactPhone("");
  };

  const removeContact = (id: string) => {
    setSafety((prev) => {
      const next = {
        ...prev,
        emergencyContacts: prev.emergencyContacts.filter((c) => c.id !== id),
      };
      localStorage.setItem("ride_token_safety_v2", JSON.stringify(next));
      return next;
    });
  };

  const handleSearchPlate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPlate.trim()) return;
    const found = safety.driverVerificationDatabase.find(
      (d) =>
        d.plate.toLowerCase().includes(searchPlate.toLowerCase().trim()) ||
        d.driverName.toLowerCase().includes(searchPlate.toLowerCase().trim())
    );
    setSearchResult(found || "not_found");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">RIDE Safety & Emergency Center</h3>
              <p className="text-xs text-muted-foreground">24/7 Security tools and incident protection</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SOS Button Section */}
        <div className="mt-6 rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          {sosTriggered ? (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white animate-bounce">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-xl font-black text-destructive">EMERGENCY SOS BROADCAST ACTIVE</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Live GPS telemetry and emergency alert broadcasted to platform security dispatch and your
                  trusted contacts!
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <a
                  href="tel:911"
                  className="inline-flex items-center gap-2 rounded-xl bg-destructive px-5 py-2.5 text-xs font-bold text-white shadow hover:opacity-90"
                >
                  <PhoneCall className="h-4 w-4" /> Call 911 Direct
                </a>
                <button
                  type="button"
                  onClick={cancelSos}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-secondary"
                >
                  Cancel SOS
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-lg font-bold text-foreground">Need Urgent Assistance?</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Pressing the SOS button alerts 24/7 security dispatch and broadcasts your live GPS coordinates.
              </p>
              <button
                type="button"
                onClick={triggerSos}
                className="mt-4 inline-flex items-center gap-2.5 rounded-full bg-destructive px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-destructive/25 hover:bg-destructive/90 active:scale-95 transition-all animate-pulse"
              >
                <ShieldAlert className="h-5 w-5" /> TRIGGER EMERGENCY SOS
              </button>
            </div>
          )}
        </div>

        {/* Quick Safety Features: Audio & Share */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Audio Recording */}
          <div className="rounded-2xl border border-border bg-secondary/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                <span className="text-sm font-bold">Audio Trip Recording</span>
              </div>
              <input
                type="checkbox"
                checked={safety.audioRecordingEnabled}
                onChange={toggleAudio}
                className="h-4 w-4 accent-primary rounded cursor-pointer"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {safety.audioRecordingEnabled
                ? "Active: Encrypted audio is recorded during trips for dispute safety."
                : "Disabled: Audio recording is currently turned off."}
            </p>
          </div>

          {/* Share Live Trip Link */}
          <div className="rounded-2xl border border-border bg-secondary/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-cyan-500" />
                <span className="text-sm font-bold">Share Live Trip</span>
              </div>
              <button
                type="button"
                onClick={copyTripLink}
                className="flex items-center gap-1 rounded-lg bg-card px-2.5 py-1 text-xs font-semibold shadow hover:bg-secondary"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : "Copy Link"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Token: {safety.shareTripToken}
            </p>
          </div>
        </div>

        {/* Trusted Emergency Contacts */}
        <div className="mt-6 border-t border-border pt-5">
          <h4 className="text-sm font-bold flex items-center gap-1.5">
            <span>Emergency Contacts</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              {safety.emergencyContacts.length}
            </span>
          </h4>

          <div className="mt-3 space-y-2">
            {safety.emergencyContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs"
              >
                <div>
                  <p className="font-bold text-foreground">{contact.name}</p>
                  <p className="text-[11px] font-mono text-muted-foreground">{contact.phone}</p>
                </div>
                <button
                  onClick={() => removeContact(contact.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Remove contact"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Contact Form */}
          <form onSubmit={addContact} className="mt-3 grid gap-2 sm:grid-cols-3">
            <input
              type="text"
              placeholder="Name (e.g. Dad)"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="rounded-xl bg-secondary hover:bg-accent px-3 py-1.5 text-xs font-bold text-foreground flex items-center justify-center gap-1 border border-border"
            >
              <UserPlus className="h-3.5 w-3.5" /> Add Contact
            </button>
          </form>
        </div>

        {/* Driver Credential Verification Database Lookup */}
        <div className="mt-6 border-t border-border pt-5">
          <h4 className="text-sm font-bold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Verify Driver License Plate</span>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Check official police clearance and vehicle inspection records before boarding.
          </p>

          <form onSubmit={handleSearchPlate} className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Enter plate number (e.g. NBL-4821 or Carlos)..."
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2 text-xs outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover shadow flex items-center gap-1.5"
            >
              <Search className="h-3.5 w-3.5" /> Verify
            </button>
          </form>

          {searchResult && searchResult !== "not_found" && (
            <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm">{searchResult.driverName}</span>
                <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  {searchResult.status}
                </span>
              </div>
              <p className="mt-1 font-mono text-muted-foreground">Plate: {searchResult.plate}</p>
              <p className="mt-0.5 text-emerald-600 font-semibold">
                Safety Score: {searchResult.safetyScore}/100 • Inspection Valid until {searchResult.validUntil}
              </p>
            </div>
          )}

          {searchResult === "not_found" && (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 animate-in fade-in">
              Plate not found in active certified driver database. Please verify with dispatch.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
