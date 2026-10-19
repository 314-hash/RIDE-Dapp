import { useState, useEffect } from "react";
import { Star, Clock, Car, ShieldCheck, ArrowUpRight, CheckCircle2, AlertCircle, Coins } from "lucide-react";
import type { DriverOffer, PaymentMethod } from "@/lib/rideStore";

interface FareOfferNegotiatorProps {
  initialOffer: number;
  paymentMethod: PaymentMethod;
  offers: DriverOffer[];
  onAcceptOffer: (offer: DriverOffer) => void;
  onUpdateOffer: (newOffer: number) => void;
  onCancelRequest: () => void;
}

export function FareOfferNegotiator({
  initialOffer,
  paymentMethod,
  offers,
  onAcceptOffer,
  onUpdateOffer,
  onCancelRequest,
}: FareOfferNegotiatorProps) {
  const [currentOffer, setCurrentOffer] = useState(initialOffer);
  const [timer, setTimer] = useState(30);

  // Countdown timer for offer expiration
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const adjustOffer = (delta: number) => {
    const updated = Math.max(5, Math.round((currentOffer + delta) * 10) / 10);
    setCurrentOffer(updated);
    onUpdateOffer(updated);
  };

  const getPaymentBadge = () => {
    if (paymentMethod === "ride_token") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-500">
          <Coins className="h-3 w-3" /> 15% Off with RIDE Token
        </span>
      );
    }
    if (paymentMethod === "sda") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-semibold text-indigo-500">
          Sidra SDA Coin
        </span>
      );
    }
    return (
      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
        Cash / Card
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Offer Bidding Adjustment */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="eyebrow">Negotiating with Nearby Drivers</p>
            </div>
            <h3 className="mt-1 text-2xl font-bold">Your Proposed Fare Offer</h3>
            <div className="mt-2 flex items-center gap-2">{getPaymentBadge()}</div>
          </div>

          {/* Quick Adjust Price */}
          <div className="flex items-center gap-2 bg-secondary/80 p-2 rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => adjustOffer(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-background font-bold text-foreground shadow hover:bg-secondary"
            >
              -$1
            </button>
            <div className="px-4 text-center">
              <span className="text-2xl font-black text-primary">${currentOffer.toFixed(2)}</span>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Your Bid</p>
            </div>
            <button
              type="button"
              onClick={() => adjustOffer(1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-background font-bold text-foreground shadow hover:bg-secondary"
            >
              +$1
            </button>
            <button
              type="button"
              onClick={() => adjustOffer(3)}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover shadow"
            >
              +$3 Fast
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          <span>Drivers will review your offer and either accept or counter-bid.</span>
          <span className="font-mono text-cyan-600 font-semibold">Refresh in {timer}s</span>
        </div>
      </div>

      {/* Incoming Driver Offers List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold flex items-center gap-2">
            <span>Incoming Driver Bids</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-semibold">
              {offers.length} Available
            </span>
          </h4>
          <span className="text-xs text-muted-foreground">Select an offer to lock in driver</span>
        </div>

        {offers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Car className="h-6 w-6 animate-bounce" />
            </div>
            <h5 className="mt-3 font-semibold">Broadcasting to Nearby Drivers...</h5>
            <p className="mt-1 text-sm text-muted-foreground">
              Please wait while nearby drivers review your proposed fare.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {offers.map((offer) => {
              const d = offer.driver;
              return (
                <div
                  key={offer.id}
                  className={`group relative overflow-hidden rounded-2xl border p-5 transition-all shadow-soft hover:shadow-lift ${
                    offer.isCounterOffer
                      ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500"
                      : "border-primary/40 bg-card hover:border-primary"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Driver Avatar & Info */}
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <img
                          src={d.avatarUrl}
                          alt={d.name}
                          className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20"
                        />
                        {d.isVerified && (
                          <span title="Verified Driver">
                            <ShieldCheck className="absolute -bottom-1 -right-1 h-5 w-5 text-emerald-500 bg-background rounded-full p-0.5" />
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-foreground text-lg">{d.name}</h5>
                          <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-bold text-amber-600">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            {d.rating.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">({d.totalTrips} rides)</span>
                        </div>

                        <p className="mt-0.5 text-sm font-medium text-foreground/80">
                          {d.vehicleModel} •{" "}
                          <span className="font-mono text-xs text-muted-foreground font-semibold">
                            {d.licensePlate}
                          </span>
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Clock className="h-3.5 w-3.5 text-primary" /> {offer.etaMinutes} mins away
                          </span>
                          <span>•</span>
                          <span>{d.distanceKm} km from pickup</span>
                        </div>
                      </div>
                    </div>

                    {/* Fare Bid & Accept Action */}
                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 border-t sm:border-t-0 border-border pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-foreground">
                            ${offer.proposedFare.toFixed(2)}
                          </span>
                        </div>
                        {offer.isCounterOffer ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                            Counter-Offer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> Matches Your Bid
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onAcceptOffer(offer)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow hover:bg-primary-hover active:scale-95 transition-all"
                      >
                        Accept Driver <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {offer.note && (
                    <div className="mt-3 rounded-lg bg-secondary/80 px-3 py-2 text-xs text-muted-foreground italic">
                      "{offer.note}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Request Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onCancelRequest}
          className="rounded-xl px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
        >
          Cancel Ride Request
        </button>
      </div>
    </div>
  );
}
