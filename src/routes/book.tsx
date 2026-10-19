import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Car,
  MapPin,
  Clock,
  Coins,
  ShieldCheck,
  CheckCircle,
  Navigation,
  ArrowRight,
  ExternalLink,
  Star,
  Sparkles,
  History,
  RotateCcw,
} from "lucide-react";
import { PageShell } from "@/components/site/Layout";
import { InteractiveMap } from "@/components/site/InteractiveMap";
import { FareOfferNegotiator } from "@/components/site/FareOfferNegotiator";
import { ActiveTripTracker } from "@/components/site/ActiveTripTracker";
import { TripReceiptModal } from "@/components/site/TripReceiptModal";
import { SafetyCenterModal } from "@/components/site/SafetyCenterModal";
import {
  type ActiveTrip,
  type RideCategory,
  type PaymentMethod,
  type DriverOffer,
  type CompletedTripRecord,
  calculateTripFare,
  generateSimulatedDriverOffers,
  loadSavedActiveTrip,
  saveActiveTrip,
  loadTripHistory,
  saveTripHistory,
  INITIAL_NEARBY_DRIVERS,
  createAuthoritativeRideOnServer,
  checkBackendConnection,
} from "@/lib/rideStore";
import { loadSavedWalletState, saveWalletState, SIDRA_CHAIN_CONFIG, executeEscrowDeposit } from "@/lib/web3";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a Ride — RIDE TOKENS Smart Mobility" },
      {
        name: "description",
        content:
          "Book rides, propose flexible fares, match with verified drivers, and track live trips with RIDE Token utility on Sidra Chain.",
      },
      { property: "og:title", content: "Book a Ride — RIDE TOKENS" },
      {
        property: "og:description",
        content: "Smart mobility with real-time tracking and digital token utility.",
      },
    ],
  }),
  component: BookPage,
});

const QUICK_LOCATIONS = [
  "Greenbelt 5, Makati",
  "BGC High Street, Taguig",
  "Ortigas Center, Pasig",
  "NAIA Terminal 3, Pasay",
  "SM Mall of Asia, Pasay",
  "Eastwood City, Quezon City",
];

const RIDE_CATEGORIES: Array<{
  id: RideCategory;
  name: string;
  tagline: string;
  capacity: string;
  baseFareUsd: number;
}> = [
  { id: "standard", name: "Standard", tagline: "Everyday rides", capacity: "4 seats", baseFareUsd: 8.0 },
  { id: "comfort", name: "Comfort", tagline: "Premium extra legroom", capacity: "4 seats", baseFareUsd: 12.0 },
  { id: "xl", name: "XL Large", tagline: "Spacious SUVs for groups", capacity: "6 seats", baseFareUsd: 16.0 },
  { id: "electric", name: "Electric EV", tagline: "Zero-emission green fleet", capacity: "4 seats", baseFareUsd: 10.0 },
  { id: "express", name: "Express Moto", tagline: "Fast city motorcycle courier", capacity: "1 seat", baseFareUsd: 5.0 },
];

function BookPage() {
  const [activeTab, setActiveTab] = useState<"book" | "radar" | "history">("book");

  // Booking Form Inputs
  const [pickup, setPickup] = useState("Greenbelt 5, Makati");
  const [destination, setDestination] = useState("BGC High Street, Taguig");
  const [intermediateStop, setIntermediateStop] = useState("");
  const [showStopInput, setShowStopInput] = useState(false);
  const [category, setCategory] = useState<RideCategory>("standard");
  const [passengers, setPassengers] = useState(1);
  const [pickupTime, setPickupTime] = useState("now");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ride_token");
  const [customOffer, setCustomOffer] = useState<number | "">("");

  // Live State
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(() => loadSavedActiveTrip());
  const [history, setHistory] = useState<CompletedTripRecord[]>(() => loadTripHistory());
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const [isServerConnected, setIsServerConnected] = useState(false);

  // Check backend server connectivity on mount
  useEffect(() => {
    checkBackendConnection().then((connected) => setIsServerConnected(connected));
  }, []);

  // Sync active trip to local storage
  useEffect(() => {
    saveActiveTrip(activeTrip);
    if (activeTrip && (activeTrip.status === "in_progress" || activeTrip.status === "driver_arriving")) {
      setActiveTab("radar");
    }
  }, [activeTrip]);

  // Fare calculation for preview
  const fareEstimate = calculateTripFare(pickup, destination, category, showStopInput && !!intermediateStop);
  const currentProposedFare = typeof customOffer === "number" ? customOffer : fareEstimate.recommendedOffer;

  // Handle ride request submission
  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup.trim() || !destination.trim()) return;

    const wallet = loadSavedWalletState();
    const passengerAddr = wallet.address || "0xPassenger112233445566778899aabbccddeeff";

    // Create authoritative ride in backend persistent SQLite database
    const serverRide = await createAuthoritativeRideOnServer({
      passengerAddress: passengerAddr,
      pickupName: pickup,
      dropoffName: destination,
      category,
      offeredFare: currentProposedFare,
      paymentMethod,
    });

    const offers = generateSimulatedDriverOffers(currentProposedFare, category, fareEstimate.distanceKm);

    const isToken = paymentMethod === "ride_token";
    const discountAmount = isToken ? fareEstimate.tokenDiscount : 0;
    const finalFare = isToken ? fareEstimate.fareWithDiscount : currentProposedFare;

    const newTrip: ActiveTrip = {
      id: serverRide?.id || "TRIP-" + Math.floor(100000 + Math.random() * 900000),
      pickup,
      destination,
      intermediateStop: showStopInput ? intermediateStop : undefined,
      category,
      passengers,
      pickupTime: pickupTime === "now" ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : pickupTime,
      distanceKm: serverRide?.distance_km || fareEstimate.distanceKm,
      durationMinutes: serverRide?.duration_minutes || fareEstimate.durationMinutes,
      baseFare: fareEstimate.baseFare,
      passengerFareOffer: currentProposedFare,
      finalFare,
      paymentMethod,
      tokenDiscountApplied: isToken,
      tokenDiscountAmount: discountAmount,
      status: "offers_received",
      matchedDriver: null,
      driverOffers: offers,
      progressPercent: 0,
      currentEtaMinutes: offers[0]?.etaMinutes || 3,
      carCoordinates: { x: 38, y: 44 },
      pickupCoordinates: { x: 26, y: 68 },
      destinationCoordinates: { x: 76, y: 28 },
      intermediateCoordinates: showStopInput ? { x: 48, y: 45 } : undefined,
      earnedRideRewards: fareEstimate.estimatedRewards,
    };

    setActiveTrip(newTrip);
  };

  // Handle driver offer acceptance
  const handleAcceptDriverOffer = (offer: DriverOffer) => {
    if (!activeTrip) return;

    const updated: ActiveTrip = {
      ...activeTrip,
      matchedDriver: offer.driver,
      finalFare: offer.proposedFare,
      status: "driver_arriving",
      currentEtaMinutes: offer.etaMinutes,
      progressPercent: 0,
    };

    setActiveTrip(updated);
    setActiveTab("radar");
  };

  // Handle passenger updating their offer
  const handleUpdateOffer = (newOffer: number) => {
    if (!activeTrip) return;
    const newOffers = generateSimulatedDriverOffers(newOffer, activeTrip.category, activeTrip.distanceKm);
    setActiveTrip({
      ...activeTrip,
      passengerFareOffer: newOffer,
      driverOffers: newOffers,
    });
  };

  // Advance simulation progress
  const handleAdvanceProgress = (percent: number) => {
    if (!activeTrip) return;
    const newEta = Math.max(1, Math.round(activeTrip.durationMinutes * (1 - percent / 100)));
    const newStatus = percent > 50 && activeTrip.status === "driver_arriving" ? "in_progress" : activeTrip.status;

    setActiveTrip({
      ...activeTrip,
      progressPercent: percent,
      currentEtaMinutes: newEta,
      status: newStatus,
    });
  };

  // Complete Trip
  const handleCompleteTrip = () => {
    if (!activeTrip) return;

    const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const rewards = activeTrip.earnedRideRewards || 8.5;

    // Credit rewards to wallet state
    const wallet = loadSavedWalletState();
    if (wallet.isConnected) {
      const currentRide = parseFloat(wallet.rideBalance) || 0;
      const currentEarned = parseFloat(wallet.earnedRewards) || 0;
      saveWalletState({
        ...wallet,
        rideBalance: (currentRide + rewards).toFixed(2),
        earnedRewards: (currentEarned + rewards).toFixed(2),
      });
    }

    // Save to history
    const record: CompletedTripRecord = {
      id: activeTrip.id,
      date: "Today, " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      pickup: activeTrip.pickup,
      destination: activeTrip.destination,
      distanceKm: activeTrip.distanceKm,
      durationMinutes: activeTrip.durationMinutes,
      farePaid: activeTrip.finalFare,
      paymentMethod: activeTrip.paymentMethod,
      driverName: activeTrip.matchedDriver?.name || "Driver",
      carModel: activeTrip.matchedDriver?.vehicleModel || "Sedan",
      licensePlate: activeTrip.matchedDriver?.licensePlate || "ABC-1234",
      ratingGiven: 5,
      txHash,
      earnedRideTokens: rewards,
      status: "completed",
    };

    const updatedHistory = [record, ...history];
    setHistory(updatedHistory);
    saveTripHistory(updatedHistory);

    setActiveTrip({
      ...activeTrip,
      status: "completed",
      progressPercent: 100,
      txHash,
    });

    setReceiptOpen(true);
  };

  // Submit Driver Rating
  const handleSubmitRating = (stars: number, review: string, tags: string[]) => {
    if (!activeTrip) return;
    setActiveTrip({
      ...activeTrip,
      rating: stars,
      review,
      reviewTags: tags,
    });
    // Reset active trip after a short pause
    setTimeout(() => {
      setActiveTrip(null);
      saveActiveTrip(null);
    }, 1500);
  };

  // Cancel Trip
  const handleCancelTrip = () => {
    setActiveTrip(null);
    saveActiveTrip(null);
  };

  return (
    <PageShell>
      {/* Top Banner & Tab Controls */}
      <section className="border-b border-border bg-card/60 py-8 backdrop-blur">
        <div className="container-page">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="eyebrow">RIDE TOKENS Smart Mobility</p>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  {isServerConnected ? "Authoritative Dispatch Server Connected (Sidra Chain: 97453)" : "Local Fallback Simulator Ready"}
                </span>
              </div>
              <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Ride Booking & Dispatch Cockpit</h1>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-secondary p-1">
              <button
                type="button"
                onClick={() => setActiveTab("book")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === "book"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Car className="h-4 w-4" /> Book Ride
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("radar")}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === "radar"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Navigation className="h-4 w-4" /> Live Tracking
                {activeTrip && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping absolute top-2 right-2" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === "history"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-4 w-4" /> Trip History ({history.length})
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-8 sm:py-12">
        <div className="container-page space-y-8">
          {/* TAB 1: BOOK A RIDE */}
          {activeTab === "book" && (
            <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
              {/* Left Column: Interactive Map & Live Bidding Radar */}
              <div className="space-y-6">
                <InteractiveMap activeTrip={activeTrip} nearbyDrivers={INITIAL_NEARBY_DRIVERS} />

                {/* If active trip has received offers, show InDrive Bidding Negotator */}
                {activeTrip && activeTrip.status === "offers_received" && (
                  <FareOfferNegotiator
                    initialOffer={activeTrip.passengerFareOffer}
                    paymentMethod={activeTrip.paymentMethod}
                    offers={activeTrip.driverOffers}
                    onAcceptOffer={handleAcceptDriverOffer}
                    onUpdateOffer={handleUpdateOffer}
                    onCancelRequest={handleCancelTrip}
                  />
                )}

                {/* If active trip is running, show tracker quick view */}
                {activeTrip && (activeTrip.status === "driver_arriving" || activeTrip.status === "in_progress") && (
                  <ActiveTripTracker
                    trip={activeTrip}
                    onAdvanceProgress={handleAdvanceProgress}
                    onCompleteTrip={handleCompleteTrip}
                    onCancelTrip={handleCancelTrip}
                    onOpenSos={() => setSafetyOpen(true)}
                  />
                )}
              </div>

              {/* Right Column: Booking Configuration Form */}
              <div>
                <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft">
                  <h2 className="text-xl font-bold flex items-center justify-between">
                    <span>Plan Your Journey</span>
                    <span className="text-xs font-mono text-cyan-600 font-semibold bg-cyan-500/10 px-2.5 py-1 rounded-full">
                      Sidra Chain Instant Dispatch
                    </span>
                  </h2>

                  <form onSubmit={handleRequestRide} className="mt-6 space-y-5">
                    {/* Pickup Field */}
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                        Pickup Location
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-500" />
                        <input
                          type="text"
                          value={pickup}
                          onChange={(e) => setPickup(e.target.value)}
                          placeholder="Enter pickup address..."
                          className="field pl-10 text-sm font-semibold"
                          required
                        />
                      </div>
                    </div>

                    {/* Intermediate Stop Toggle */}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowStopInput(!showStopInput)}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        {showStopInput ? "— Remove Intermediate Stop" : "+ Add Intermediate Stop"}
                      </button>
                    </div>

                    {showStopInput && (
                      <div className="animate-in fade-in">
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                          Intermediate Stop
                        </label>
                        <input
                          type="text"
                          value={intermediateStop}
                          onChange={(e) => setIntermediateStop(e.target.value)}
                          placeholder="e.g. Rockwell Center (optional stop)"
                          className="field text-sm"
                        />
                      </div>
                    )}

                    {/* Destination Field */}
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                        Destination
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-rose-500" />
                        <input
                          type="text"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          placeholder="Enter destination address..."
                          className="field pl-10 text-sm font-semibold"
                          required
                        />
                      </div>
                    </div>

                    {/* Quick Location Pills */}
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5">
                        Popular City Hubs
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_LOCATIONS.map((loc) => (
                          <button
                            type="button"
                            key={loc}
                            onClick={() => setDestination(loc)}
                            className="rounded-lg border border-border bg-secondary/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ride Categories Selector */}
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                        Select Ride Category
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {RIDE_CATEGORIES.map((cat) => {
                          const isSelected = category === cat.id;
                          return (
                            <button
                              type="button"
                              key={cat.id}
                              onClick={() => setCategory(cat.id)}
                              className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                  : "border-border bg-card hover:bg-secondary/50"
                              }`}
                            >
                              <div className="flex w-full items-center justify-between">
                                <span className="font-bold text-sm text-foreground">{cat.name}</span>
                                <span className="text-xs font-black text-primary">${cat.baseFareUsd.toFixed(2)}</span>
                              </div>
                              <span className="text-[11px] text-muted-foreground mt-0.5">{cat.tagline}</span>
                              <span className="text-[10px] font-semibold text-muted-foreground mt-1 font-mono">
                                {cat.capacity}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Passengers & Schedule */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                          Passengers
                        </label>
                        <select
                          value={passengers}
                          onChange={(e) => setPassengers(Number(e.target.value))}
                          className="field text-sm font-semibold"
                        >
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? "Passenger" : "Passengers"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                          Pickup Time
                        </label>
                        <select
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="field text-sm font-semibold"
                        >
                          <option value="now">Immediate (Now)</option>
                          <option value="In 15 mins">In 15 mins</option>
                          <option value="In 30 mins">In 30 mins</option>
                          <option value="In 1 hour">In 1 hour</option>
                        </select>
                      </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                        Payment Option
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label
                          className={`cursor-pointer rounded-2xl border p-3 flex flex-col transition-all ${
                            paymentMethod === "ride_token"
                              ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/20"
                              : "border-border bg-card"
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment"
                            value="ride_token"
                            checked={paymentMethod === "ride_token"}
                            onChange={() => setPaymentMethod("ride_token")}
                            className="sr-only"
                          />
                          <span className="flex items-center gap-1.5 font-bold text-xs text-cyan-600 dark:text-cyan-400">
                            <Coins className="h-4 w-4" /> RIDE Token
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">15% Instant Discount</span>
                        </label>

                        <label
                          className={`cursor-pointer rounded-2xl border p-3 flex flex-col transition-all ${
                            paymentMethod === "sda"
                              ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20"
                              : "border-border bg-card"
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment"
                            value="sda"
                            checked={paymentMethod === "sda"}
                            onChange={() => setPaymentMethod("sda")}
                            className="sr-only"
                          />
                          <span className="font-bold text-xs text-foreground">SDA Sidra Coin</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">Native Sidra Gas</span>
                        </label>

                        <label
                          className={`cursor-pointer rounded-2xl border p-3 flex flex-col transition-all ${
                            paymentMethod === "electronic"
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card"
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment"
                            value="electronic"
                            checked={paymentMethod === "electronic"}
                            onChange={() => setPaymentMethod("electronic")}
                            className="sr-only"
                          />
                          <span className="font-bold text-xs text-foreground">Card / E-Wallet</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">Cashless digital</span>
                        </label>

                        <label
                          className={`cursor-pointer rounded-2xl border p-3 flex flex-col transition-all ${
                            paymentMethod === "cash"
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card"
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment"
                            value="cash"
                            checked={paymentMethod === "cash"}
                            onChange={() => setPaymentMethod("cash")}
                            className="sr-only"
                          />
                          <span className="font-bold text-xs text-foreground">Cash</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">Pay driver directly</span>
                        </label>
                      </div>
                    </div>

                    {/* Flexible Fare Proposal Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase">
                          Your Fare Offer (InDrive Bidding)
                        </label>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Rec: ${fareEstimate.recommendedOffer.toFixed(2)}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3.5 font-bold text-muted-foreground">$</span>
                        <input
                          type="number"
                          step="0.5"
                          value={customOffer}
                          onChange={(e) => setCustomOffer(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder={fareEstimate.recommendedOffer.toFixed(2)}
                          className="field pl-8 font-black text-lg text-primary"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Leave blank to use platform recommended fare, or propose your own price for drivers to bid!
                      </p>
                    </div>

                    {/* Fare Summary & Token Rewards Box */}
                    <div className="rounded-2xl border border-border bg-secondary/60 p-4 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated Distance & Time</span>
                        <span className="font-semibold text-foreground">
                          {fareEstimate.distanceKm} km • ~{fareEstimate.durationMinutes} mins
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Proposed Fare</span>
                        <span className="font-semibold">${currentProposedFare.toFixed(2)}</span>
                      </div>

                      {paymentMethod === "ride_token" && (
                        <div className="flex justify-between text-cyan-600 dark:text-cyan-400 font-bold">
                          <span>15% RIDE Token Discount</span>
                          <span>-${fareEstimate.tokenDiscount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between border-t border-border pt-2 text-sm font-black">
                        <span>Total Estimated Fare</span>
                        <span className="text-primary text-base">
                          $
                          {paymentMethod === "ride_token"
                            ? fareEstimate.fareWithDiscount.toFixed(2)
                            : currentProposedFare.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-emerald-600">
                        <span className="flex items-center gap-1">
                          <Coins className="h-3.5 w-3.5" /> Ride-to-Earn Cashback
                        </span>
                        <span>+{fareEstimate.estimatedRewards} RIDE</span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-soft hover:bg-primary-hover active:scale-98 transition-all flex items-center justify-center gap-2"
                    >
                      <Car className="h-4 w-4" />
                      <span>Search Nearby Drivers & Propose Fare</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE TRACKING RADAR */}
          {activeTab === "radar" && (
            <div className="space-y-6">
              <InteractiveMap activeTrip={activeTrip} nearbyDrivers={INITIAL_NEARBY_DRIVERS} />

              {activeTrip ? (
                activeTrip.status === "offers_received" ? (
                  <FareOfferNegotiator
                    initialOffer={activeTrip.passengerFareOffer}
                    paymentMethod={activeTrip.paymentMethod}
                    offers={activeTrip.driverOffers}
                    onAcceptOffer={handleAcceptDriverOffer}
                    onUpdateOffer={handleUpdateOffer}
                    onCancelRequest={handleCancelTrip}
                  />
                ) : (
                  <ActiveTripTracker
                    trip={activeTrip}
                    onAdvanceProgress={handleAdvanceProgress}
                    onCompleteTrip={handleCompleteTrip}
                    onCancelTrip={handleCancelTrip}
                    onOpenSos={() => setSafetyOpen(true)}
                  />
                )
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
                  <Navigation className="mx-auto h-12 w-12 text-muted-foreground animate-bounce" />
                  <h3 className="mt-4 text-xl font-bold">No Active Trip in Progress</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                    You don't have an active ride right now. Plan a trip on the booking tab to match with drivers and track your journey live!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("book")}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover shadow"
                  >
                    Book a Ride Now <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRIP HISTORY & RECEIPTS */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Your Completed Rides & Ledgers</h3>
                  <p className="text-xs text-muted-foreground">
                    Auditable on-chain proof of transport with RIDE token reward mints
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("book")}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover shadow"
                >
                  Book New Ride
                </button>
              </div>

              {history.length === 0 ? (
                <div className="rounded-3xl border border-border bg-card p-10 text-center">
                  <History className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h4 className="mt-3 font-bold">No trip history yet</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Complete your first ride to earn RIDE tokens and see verified receipts here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {history.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:shadow-lift transition-all"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-muted-foreground">{record.id}</span>
                            <span className="text-xs text-muted-foreground">• {record.date}</span>
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                              Completed
                            </span>
                          </div>

                          <h4 className="text-lg font-bold text-foreground">
                            {record.pickup} → {record.destination}
                          </h4>

                          <p className="text-xs text-muted-foreground">
                            Driver: <span className="font-semibold text-foreground">{record.driverName}</span> (
                            {record.carModel} • {record.licensePlate}) • {record.distanceKm} km in{" "}
                            {record.durationMinutes} mins
                          </p>
                        </div>

                        <div className="flex flex-col sm:items-end gap-1.5">
                          <span className="text-2xl font-black text-foreground">${record.farePaid.toFixed(2)}</span>
                          <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                            <Coins className="h-3 w-3" /> +{record.earnedRideTokens} RIDE Earned
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground uppercase">
                            Paid via {record.paymentMethod.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      {/* Transaction Hash & Rating */}
                      <div className="mt-4 flex flex-wrap items-center justify-between border-t border-border pt-3 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          <span className="font-mono truncate max-w-[200px] sm:max-w-xs">{record.txHash}</span>
                          <a
                            href={`${SIDRA_CHAIN_CONFIG.blockExplorerUrl}/tx/${record.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline flex items-center gap-0.5 font-semibold"
                          >
                            Proof <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>

                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3.5 w-3.5 ${
                                s <= (record.ratingGiven || 5)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Trip Receipt Modal */}
      {activeTrip && (
        <TripReceiptModal
          trip={activeTrip}
          isOpen={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          onSubmitRating={handleSubmitRating}
        />
      )}

      {/* Safety Center Modal */}
      <SafetyCenterModal isOpen={safetyOpen} onClose={() => setSafetyOpen(false)} />
    </PageShell>
  );
}
