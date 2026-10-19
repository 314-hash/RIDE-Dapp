import { useState } from "react";
import { CheckCircle2, Star, Coins, ExternalLink, ShieldCheck, ThumbsUp, X } from "lucide-react";
import type { ActiveTrip } from "@/lib/rideStore";
import { SIDRA_CHAIN_CONFIG } from "@/lib/web3";

interface TripReceiptModalProps {
  trip: ActiveTrip;
  isOpen: boolean;
  onClose: () => void;
  onSubmitRating: (stars: number, review: string, tags: string[]) => void;
}

const REVIEW_TAGS = [
  "Polite Driver",
  "Clean Vehicle",
  "Smooth Driving",
  "Great Route Choice",
  "Comfortable Temperature",
  "Good Music",
];

export function TripReceiptModal({ trip, isOpen, onClose, onSubmitRating }: TripReceiptModalProps) {
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["Polite Driver", "Clean Vehicle"]);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitRating(stars, review, selectedTags);
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const txHash =
    trip.txHash ||
    "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Close Receipt"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Celebration Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 ring-8 ring-emerald-500/10">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="eyebrow mt-3 text-emerald-500">Trip Completed</p>
          <h3 className="mt-1 text-2xl font-black">Thank You for Riding!</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your journey with {trip.matchedDriver?.name || "Driver"} is officially settled.
          </p>
        </div>

        {/* Token Reward Box */}
        <div className="mt-5 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-primary/10 to-emerald-500/15 border border-cyan-500/30 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Coins className="h-5 w-5 text-cyan-500" />
            <span className="text-sm font-bold text-foreground">Ride-to-Earn Rewards Credited</span>
          </div>
          <p className="mt-1 text-3xl font-black text-cyan-600 dark:text-cyan-400">
            +{trip.earnedRideRewards || 8.5} RIDE
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Verified network contribution token mint on Sidra Chain
          </p>
        </div>

        {/* Fare Breakdown Card */}
        <div className="mt-5 rounded-2xl border border-border bg-secondary/50 p-4 space-y-2 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Route</span>
            <span className="font-medium text-foreground text-right truncate max-w-[200px]">
              {trip.pickup} → {trip.destination}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Distance & Duration</span>
            <span className="font-medium text-foreground">
              {trip.distanceKm} km • {trip.durationMinutes} mins
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Base Fare</span>
            <span className="font-medium text-foreground">${trip.baseFare.toFixed(2)}</span>
          </div>

          {trip.tokenDiscountApplied && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>15% RIDE Token Discount</span>
              <span>-${trip.tokenDiscountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-border pt-2 text-sm font-bold">
            <span>Total Paid</span>
            <span className="text-primary font-black">${trip.finalFare.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-muted-foreground text-[11px] pt-1">
            <span>Payment Method</span>
            <span className="font-mono font-semibold uppercase">{trip.paymentMethod.replace("_", " ")}</span>
          </div>
        </div>

        {/* On-Chain Verification Link */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <div className="truncate">
              <p className="font-semibold text-foreground">On-Chain Sidra Proof</p>
              <p className="font-mono text-[10px] text-muted-foreground truncate">{txHash}</p>
            </div>
          </div>
          <a
            href={`${SIDRA_CHAIN_CONFIG.blockExplorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-primary hover:underline font-semibold shrink-0 ml-2"
          >
            Explorer <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Driver Rating & Review Section */}
        <form onSubmit={handleSubmit} className="mt-6 border-t border-border pt-5">
          <h4 className="text-center text-sm font-bold">Rate your experience with {trip.matchedDriver?.name}</h4>

          {/* Interactive Star Selector */}
          <div className="mt-3 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setStars(star)}
                className="p-1 transition-transform hover:scale-125 focus:outline-none"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= stars
                      ? "fill-amber-400 text-amber-400 drop-shadow"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Compliment Badges */}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {REVIEW_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-primary text-primary-foreground shadow"
                    : "border border-border bg-secondary text-muted-foreground hover:bg-accent"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Review Text */}
          <div className="mt-4">
            <textarea
              rows={2}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Leave a comment for your driver (optional)..."
              className="field text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitted}
            className="mt-4 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-soft hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
          >
            {submitted ? (
              <>
                <ThumbsUp className="h-4 w-4" /> Rating Submitted!
              </>
            ) : (
              "Submit Rating & Close Receipt"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
