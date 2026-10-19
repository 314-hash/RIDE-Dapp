import { useEffect, useState } from "react";
import { Car, Navigation, MapPin, ZoomIn, ZoomOut, Compass, Shield } from "lucide-react";
import type { ActiveTrip, DriverInfo } from "@/lib/rideStore";
import { INITIAL_NEARBY_DRIVERS } from "@/lib/rideStore";

interface InteractiveMapProps {
  activeTrip?: ActiveTrip | null;
  nearbyDrivers?: DriverInfo[];
  heightClass?: string;
  className?: string;
  showNearbyDrivers?: boolean;
}

export function InteractiveMap({
  activeTrip,
  nearbyDrivers = INITIAL_NEARBY_DRIVERS,
  heightClass = "h-[420px] sm:h-[480px]",
  className = "",
  showNearbyDrivers = true,
}: InteractiveMapProps) {
  const [zoom, setZoom] = useState(1);
  const [trafficMode, setTrafficMode] = useState(true);
  const [pulse, setPulse] = useState(0);

  // Subtle pulsing animation tick
  useEffect(() => {
    const timer = setInterval(() => {
      setPulse((p) => (p + 1) % 100);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute road path coordinates
  // Pickup ~ { x: 25, y: 70 }, Destination ~ { x: 78, y: 28 }, Intermediate ~ { x: 48, y: 46 }
  const pickup = activeTrip?.pickupCoordinates || { x: 26, y: 68 };
  const dest = activeTrip?.destinationCoordinates || { x: 76, y: 28 };
  const hasStop = !!activeTrip?.intermediateStop;
  const stop = activeTrip?.intermediateCoordinates || { x: 48, y: 45 };

  // Calculate car position along the path based on progressPercent (0 to 100)
  const progress = activeTrip?.progressPercent || 0;
  let carX = pickup.x;
  let carY = pickup.y;
  let carRotation = 45; // angle in degrees

  if (activeTrip?.status === "driver_arriving") {
    // Driver approaching pickup from nearby
    const startX = activeTrip.matchedDriver?.coordinates.x || 38;
    const startY = activeTrip.matchedDriver?.coordinates.y || 44;
    const t = Math.min(1, progress / 100);
    carX = startX + (pickup.x - startX) * t;
    carY = startY + (pickup.y - startY) * t;
    carRotation = Math.atan2(pickup.y - startY, pickup.x - startX) * (180 / Math.PI);
  } else if (activeTrip && (activeTrip.status === "in_progress" || activeTrip.status === "completed")) {
    if (hasStop) {
      if (progress < 50) {
        const t = progress / 50;
        carX = pickup.x + (stop.x - pickup.x) * t;
        carY = pickup.y + (stop.y - pickup.y) * t;
        carRotation = Math.atan2(stop.y - pickup.y, stop.x - pickup.x) * (180 / Math.PI);
      } else {
        const t = (progress - 50) / 50;
        carX = stop.x + (dest.x - stop.x) * t;
        carY = stop.y + (dest.y - stop.y) * t;
        carRotation = Math.atan2(dest.y - stop.y, dest.x - stop.x) * (180 / Math.PI);
      }
    } else {
      const t = progress / 100;
      // Add a slight realistic curve via Bezier midpoint
      const ctrlX = 52;
      const ctrlY = 56;
      const oneMinusT = 1 - t;
      carX = oneMinusT * oneMinusT * pickup.x + 2 * oneMinusT * t * ctrlX + t * t * dest.x;
      carY = oneMinusT * oneMinusT * pickup.y + 2 * oneMinusT * t * ctrlY + t * t * dest.y;

      // Tangent angle
      const dx = 2 * (1 - t) * (ctrlX - pickup.x) + 2 * t * (dest.x - ctrlX);
      const dy = 2 * (1 - t) * (ctrlY - pickup.y) + 2 * t * (dest.y - ctrlY);
      carRotation = Math.atan2(dy, dx) * (180 / Math.PI);
    }
  }

  // Current street display
  const currentStreet =
    progress < 30
      ? "Ayala Avenue Corridor"
      : progress < 70
        ? "McKinley Parkway Expressway"
        : "Bonifacio Global Circle";

  return (
    <div
      className={`relative isolate overflow-hidden rounded-3xl border border-border bg-slate-950 text-slate-100 shadow-lift select-none ${heightClass} ${className}`}
    >
      {/* City Grid & Map Background SVG */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full opacity-90 transition-transform duration-300"
        style={{ transform: `scale(${zoom})` }}
      >
        <defs>
          {/* Street Pattern */}
          <pattern id="streetGrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.35" />
          </pattern>

          {/* Glowing Filters */}
          <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowPrimary" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradients */}
          <linearGradient id="routeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {/* Base Map Terrain */}
        <rect width="100" height="100" fill="#090d16" />
        <rect width="100" height="100" fill="url(#streetGrid)" opacity="0.6" />

        {/* Simulated River / Waterway */}
        <path
          d="M -5 30 Q 30 20, 50 38 T 105 25 L 105 32 Q 50 44, 30 26 T -5 36 Z"
          fill="#0c1e3d"
          opacity="0.8"
        />

        {/* Parks / Green Zones */}
        <path d="M 12 14 Q 22 10, 24 22 T 14 26 Z" fill="#062822" opacity="0.7" />
        <path d="M 68 70 Q 82 66, 85 82 T 66 84 Z" fill="#062822" opacity="0.7" />

        {/* Major Arterial Roads */}
        <path d="M 0 50 L 100 50" stroke="#1e293b" strokeWidth="1.8" />
        <path d="M 45 0 L 45 100" stroke="#1e293b" strokeWidth="1.8" />
        <path d="M 0 75 Q 50 65, 100 30" stroke="#334155" strokeWidth="2.2" fill="none" />
        <path d="M 20 0 Q 35 50, 85 100" stroke="#334155" strokeWidth="2.0" fill="none" />

        {/* Traffic Congestion Overlay */}
        {trafficMode && (
          <>
            <path d="M 0 50 L 35 50" stroke="#10b981" strokeWidth="1.0" opacity="0.7" />
            <path d="M 35 50 L 65 50" stroke="#eab308" strokeWidth="1.0" opacity="0.7" />
            <path d="M 65 50 L 100 50" stroke="#10b981" strokeWidth="1.0" opacity="0.7" />
            <path d="M 0 75 Q 35 68, 60 52" stroke="#10b981" strokeWidth="1.2" fill="none" opacity="0.6" />
            <path d="M 60 52 Q 80 40, 100 30" stroke="#ef4444" strokeWidth="1.2" fill="none" opacity="0.7" />
          </>
        )}

        {/* ACTIVE ROUTE LINE (Curved trajectory) */}
        {activeTrip && (
          <>
            {/* Route Shadow / Glow */}
            <path
              d={
                hasStop
                  ? `M ${pickup.x} ${pickup.y} Q 36 58, ${stop.x} ${stop.y} T ${dest.x} ${dest.y}`
                  : `M ${pickup.x} ${pickup.y} Q 52 56, ${dest.x} ${dest.y}`
              }
              fill="none"
              stroke="#06b6d4"
              strokeWidth="3.2"
              opacity="0.35"
              filter="url(#glowCyan)"
            />

            {/* Active Core Route Path */}
            <path
              d={
                hasStop
                  ? `M ${pickup.x} ${pickup.y} Q 36 58, ${stop.x} ${stop.y} T ${dest.x} ${dest.y}`
                  : `M ${pickup.x} ${pickup.y} Q 52 56, ${dest.x} ${dest.y}`
              }
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth="1.8"
              strokeDasharray="2, 1"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>

      {/* NEARBY DRIVERS ICONS (Free Roaming) */}
      {showNearbyDrivers &&
        (!activeTrip || activeTrip.status === "searching" || activeTrip.status === "offers_received") &&
        nearbyDrivers.map((driver) => {
          return (
            <div
              key={driver.id}
              className="group absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 hover:z-30"
              style={{ left: `${driver.coordinates.x}%`, top: `${driver.coordinates.y}%` }}
            >
              {/* Pulsing ring */}
              <div className="absolute -inset-1.5 animate-ping rounded-full bg-cyan-500/20" />
              {/* Car Icon Pin */}
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/50 bg-slate-900 shadow-md transition-transform group-hover:scale-125">
                <Car className="h-4 w-4 text-cyan-400" />
              </div>
              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900/95 px-2.5 py-1 text-xs shadow-lg backdrop-blur">
                <p className="font-semibold text-white">{driver.name}</p>
                <p className="text-[10px] text-cyan-400">
                  {driver.vehicleModel} • {driver.distanceKm} km away
                </p>
              </div>
            </div>
          );
        })}

      {/* PICKUP PIN */}
      {activeTrip && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${pickup.x}%`, top: `${pickup.y}%` }}
        >
          <div className="relative flex flex-col items-center">
            <span className="relative flex h-6 w-6 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
            </span>
            <div className="mt-1 whitespace-nowrap rounded-md border border-emerald-500/30 bg-slate-900/90 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 shadow backdrop-blur">
              Pickup: {activeTrip.pickup.slice(0, 18)}...
            </div>
          </div>
        </div>
      )}

      {/* DESTINATION PIN */}
      {activeTrip && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${dest.x}%`, top: `${dest.y}%` }}
        >
          <div className="relative flex flex-col items-center">
            <span className="relative flex h-6 w-6 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-40" />
              <MapPin className="relative h-6 w-6 text-rose-500 drop-shadow" />
            </span>
            <div className="mt-0.5 whitespace-nowrap rounded-md border border-rose-500/30 bg-slate-900/90 px-2 py-0.5 text-[11px] font-semibold text-rose-400 shadow backdrop-blur">
              Dropoff: {activeTrip.destination.slice(0, 18)}...
            </div>
          </div>
        </div>
      )}

      {/* INTERMEDIATE STOP PIN */}
      {activeTrip && hasStop && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
        >
          <div className="relative flex flex-col items-center">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber-400 bg-amber-500 text-[9px] font-bold text-slate-950 shadow">
              1
            </span>
            <div className="mt-0.5 whitespace-nowrap rounded-md border border-amber-500/30 bg-slate-900/90 px-1.5 py-0.5 text-[10px] text-amber-300 backdrop-blur">
              Stop
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE MOVING CAR MARKER */}
      {activeTrip && (activeTrip.status === "driver_arriving" || activeTrip.status === "in_progress") && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-300 ease-out"
          style={{ left: `${carX}%`, top: `${carY}%` }}
        >
          <div className="relative flex flex-col items-center">
            {/* Speed & Heading Label */}
            <div className="mb-1 whitespace-nowrap rounded-full border border-primary/50 bg-primary/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg backdrop-blur">
              {activeTrip.status === "driver_arriving" ? "Arriving" : "44 km/h"}
            </div>

            {/* Glowing animated vehicle */}
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.8)]"
              style={{ transform: `rotate(${carRotation - 90}deg)` }}
            >
              <Navigation className="h-5 w-5 fill-white" />
            </div>
          </div>
        </div>
      )}

      {/* MAP OVERLAYS & HUD */}
      {/* Top Left: Navigation / Route Status Bar */}
      <div className="absolute top-4 left-4 z-10 flex max-w-[85%] flex-col gap-1.5 sm:max-w-md">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-3.5 py-2 shadow-lg backdrop-blur">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Compass className="h-4 w-4 animate-spin-slow" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-100">{currentStreet}</p>
            <p className="text-[10px] text-slate-400">
              {activeTrip && activeTrip.status === "in_progress"
                ? `GPS Live • Remaining: ${Math.max(1, Math.round(activeTrip.distanceKm * (1 - progress / 100) * 10) / 10)} km`
                : activeTrip && activeTrip.status === "driver_arriving"
                  ? `Driver is ${activeTrip.currentEtaMinutes} mins away`
                  : "Live Mobility Radar • Sidra Chain Network Active"}
            </p>
          </div>
        </div>
      </div>

      {/* Top Right: Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
        <button
          onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 text-slate-200 shadow transition-colors hover:bg-slate-800"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 text-slate-200 shadow transition-colors hover:bg-slate-800"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => setTrafficMode(!trafficMode)}
          className={`flex h-8 w-8 items-center justify-center rounded-xl border shadow transition-colors ${
            trafficMode
              ? "border-emerald-500/50 bg-emerald-950/80 text-emerald-400"
              : "border-slate-800 bg-slate-900/90 text-slate-400"
          }`}
          title="Toggle Traffic Layer"
          aria-label="Toggle Traffic Layer"
        >
          <Shield className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bottom Left: Live Telemetry Legend */}
      <div className="absolute bottom-3 left-4 z-10 hidden items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/80 px-3 py-1.5 text-[10px] text-slate-400 backdrop-blur sm:flex">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Normal Flow
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Moderate
        </span>
        <span className="flex items-center gap-1 text-cyan-300">
          <Navigation className="h-3 w-3 text-cyan-400" /> OSRM Road Geometry
        </span>
        <span className="border-l border-slate-800 pl-2 text-violet-400 font-mono">
          Sidra Chain: 97453
        </span>
      </div>

      {/* Bottom Right: Scale Marker */}
      <div className="absolute bottom-3 right-4 z-10 rounded-md border border-slate-800 bg-slate-900/70 px-2 py-0.5 font-mono text-[9px] text-slate-400">
        1 km ──
      </div>
    </div>
  );
}
