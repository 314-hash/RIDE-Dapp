/**
 * RIDE TOKENS - Core Mobility & Ride State Store
 * Manages ride booking, nearby drivers, bidding/fare negotiation,
 * real-time GPS tracking simulation, driver portal, trip history, and rewards.
 */

export type RideCategory = "standard" | "comfort" | "xl" | "electric" | "express";
export type PaymentMethod = "cash" | "electronic" | "ride_token" | "sda";

export type TripStatus =
  | "idle"
  | "searching"
  | "offers_received"
  | "driver_assigned"
  | "driver_arriving"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface DriverInfo {
  id: string;
  name: string;
  rating: number;
  totalTrips: number;
  vehicleModel: string;
  vehicleType: RideCategory;
  licensePlate: string;
  color: string;
  phone: string;
  distanceKm: number;
  etaMinutes: number;
  avatarUrl: string;
  isVerified: boolean;
  backgroundCheckApproved: boolean;
  insuranceActive: boolean;
  coordinates: { x: number; y: number }; // Relative map coordinates (0-100)
}

export interface DriverOffer {
  id: string;
  driver: DriverInfo;
  proposedFare: number;
  etaMinutes: number;
  note: string;
  isCounterOffer: boolean;
  expiresInSeconds: number;
}

export interface ActiveTrip {
  id: string;
  pickup: string;
  destination: string;
  intermediateStop?: string | undefined;
  category: RideCategory;
  passengers: number;
  pickupTime: string;
  notes?: string | undefined;
  distanceKm: number;
  durationMinutes: number;
  baseFare: number;
  passengerFareOffer: number;
  finalFare: number;
  paymentMethod: PaymentMethod;
  tokenDiscountApplied: boolean;
  tokenDiscountAmount: number;
  status: TripStatus;
  matchedDriver: DriverInfo | null;
  driverOffers: DriverOffer[];
  progressPercent: number; // 0 to 100
  currentEtaMinutes: number;
  carCoordinates: { x: number; y: number };
  pickupCoordinates: { x: number; y: number };
  destinationCoordinates: { x: number; y: number };
  intermediateCoordinates?: { x: number; y: number } | undefined;
  startTime?: number | undefined;
  completedTime?: number | undefined;
  txHash?: string | undefined;
  earnedRideRewards?: number | undefined;
  rating?: number | undefined;
  review?: string | undefined;
  reviewTags?: string[] | undefined;
}

export interface CompletedTripRecord {
  id: string;
  date: string;
  pickup: string;
  destination: string;
  distanceKm: number;
  durationMinutes: number;
  farePaid: number;
  paymentMethod: PaymentMethod;
  driverName: string;
  carModel: string;
  licensePlate: string;
  ratingGiven?: number | undefined;
  txHash: string;
  earnedRideTokens: number;
  status: "completed" | "cancelled";
}

export interface DriverPortalState {
  isOnline: boolean;
  driverName: string;
  driverPhone: string;
  vehicleModel: string;
  licensePlate: string;
  rating: number;
  completedTrips: number;
  acceptanceRate: number;
  todayEarningsSda: number;
  todayEarningsRide: number;
  incomingRequests: Array<{
    id: string;
    passengerName: string;
    pickup: string;
    destination: string;
    distanceKm: number;
    proposedFare: number;
    paymentMethod: PaymentMethod;
    expiresIn: number;
  }>;
}

export interface SafetySettings {
  sosActive: boolean;
  sosAlertTimestamp?: number | undefined;
  emergencyContacts: Array<{ id: string; name: string; phone: string; relationship: string }>;
  audioRecordingEnabled: boolean;
  shareTripToken: string;
  driverVerificationDatabase: Array<{
    plate: string;
    driverName: string;
    status: "Verified & Active" | "Pending Annual Inspection" | "Suspended";
    validUntil: string;
    safetyScore: number;
  }>;
}

// Initial realistic drivers in the surrounding area
export const INITIAL_NEARBY_DRIVERS: DriverInfo[] = [
  {
    id: "drv_1",
    name: "Carlos Mendoza",
    rating: 4.96,
    totalTrips: 1840,
    vehicleModel: "Toyota Vios 1.5G",
    vehicleType: "standard",
    licensePlate: "NBL-4821",
    color: "Pearl White",
    phone: "+63 917 555 3821",
    distanceKm: 0.8,
    etaMinutes: 2,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    isVerified: true,
    backgroundCheckApproved: true,
    insuranceActive: true,
    coordinates: { x: 38, y: 44 },
  },
  {
    id: "drv_2",
    name: "Elena Rostova",
    rating: 4.98,
    totalTrips: 2410,
    vehicleModel: "Hyundai Ioniq 5 (EV)",
    vehicleType: "electric",
    licensePlate: "EVS-9012",
    color: "Cyber Gray",
    phone: "+63 920 444 9012",
    distanceKm: 1.4,
    etaMinutes: 4,
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    isVerified: true,
    backgroundCheckApproved: true,
    insuranceActive: true,
    coordinates: { x: 55, y: 32 },
  },
  {
    id: "drv_3",
    name: "Mateo Cruz",
    rating: 4.91,
    totalTrips: 920,
    vehicleModel: "Honda CR-V Turbo",
    vehicleType: "comfort",
    licensePlate: "WXY-7731",
    color: "Obsidian Black",
    phone: "+63 918 222 7731",
    distanceKm: 2.1,
    etaMinutes: 5,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    isVerified: true,
    backgroundCheckApproved: true,
    insuranceActive: true,
    coordinates: { x: 25, y: 68 },
  },
  {
    id: "drv_4",
    name: "Ramon Valenzuela",
    rating: 4.88,
    totalTrips: 3120,
    vehicleModel: "Toyota Innova 2.8",
    vehicleType: "xl",
    licensePlate: "TXG-5510",
    color: "Silver Metallic",
    phone: "+63 927 888 5510",
    distanceKm: 2.8,
    etaMinutes: 7,
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    isVerified: true,
    backgroundCheckApproved: true,
    insuranceActive: true,
    coordinates: { x: 70, y: 60 },
  },
  {
    id: "drv_5",
    name: "Joshua Santos",
    rating: 4.95,
    totalTrips: 1540,
    vehicleModel: "Yamaha NMAX 155",
    vehicleType: "express",
    licensePlate: "MC-88124",
    color: "Matte Blue",
    phone: "+63 908 111 8812",
    distanceKm: 0.5,
    etaMinutes: 1,
    avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    isVerified: true,
    backgroundCheckApproved: true,
    insuranceActive: true,
    coordinates: { x: 42, y: 52 },
  },
];

// Sample default completed trips in history
export const DEFAULT_TRIP_HISTORY: CompletedTripRecord[] = [
  {
    id: "TRIP-97453-882",
    date: "Yesterday, 6:45 PM",
    pickup: "Greenbelt 5, Makati",
    destination: "BGC High Street, Taguig",
    distanceKm: 5.8,
    durationMinutes: 16,
    farePaid: 18.5,
    paymentMethod: "ride_token",
    driverName: "Carlos Mendoza",
    carModel: "Toyota Vios",
    licensePlate: "NBL-4821",
    ratingGiven: 5,
    txHash: "0x8fa1b439e6a0d2f1c8e9b05321a4f3b7e9c02d184a5c6e7f8b9a0b1c2d3e4f5a",
    earnedRideTokens: 8.7,
    status: "completed",
  },
  {
    id: "TRIP-97453-731",
    date: "17 Oct 2026, 8:15 AM",
    pickup: "Ortigas Center, Pasig",
    destination: "NAIA Terminal 3, Pasay",
    distanceKm: 14.2,
    durationMinutes: 34,
    farePaid: 42.0,
    paymentMethod: "sda",
    driverName: "Elena Rostova",
    carModel: "Hyundai Ioniq 5",
    licensePlate: "EVS-9012",
    ratingGiven: 5,
    txHash: "0x3e17ab890c2f4d5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
    earnedRideTokens: 21.3,
    status: "completed",
  },
  {
    id: "TRIP-97453-619",
    date: "14 Oct 2026, 2:30 PM",
    pickup: "Eastwood City, Quezon City",
    destination: "UP Diliman, Quezon City",
    distanceKm: 7.1,
    durationMinutes: 19,
    farePaid: 22.0,
    paymentMethod: "electronic",
    driverName: "Mateo Cruz",
    carModel: "Honda CR-V",
    licensePlate: "WXY-7731",
    ratingGiven: 4,
    txHash: "0x7b9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
    earnedRideTokens: 10.65,
    status: "completed",
  },
];

const STORAGE_KEYS = {
  ACTIVE_TRIP: "ride_token_active_trip_v2",
  HISTORY: "ride_token_history_v2",
  DRIVER_PORTAL: "ride_token_driver_portal_v2",
  SAFETY: "ride_token_safety_v2",
};

export function loadSavedActiveTrip(): ActiveTrip | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveActiveTrip(trip: ActiveTrip | null) {
  if (typeof window === "undefined") return;
  try {
    if (trip) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP, JSON.stringify(trip));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP);
    }
  } catch (e) {
    console.error("Failed to save active trip:", e);
  }
}

export function loadTripHistory(): CompletedTripRecord[] {
  if (typeof window === "undefined") return DEFAULT_TRIP_HISTORY;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : DEFAULT_TRIP_HISTORY;
  } catch {
    return DEFAULT_TRIP_HISTORY;
  }
}

export function saveTripHistory(history: CompletedTripRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save trip history:", e);
  }
}

export function loadSafetySettings(): SafetySettings {
  const defaultSafety: SafetySettings = {
    sosActive: false,
    emergencyContacts: [
      { id: "c1", name: "Maria Santos (Mom)", phone: "+63 917 123 4567", relationship: "Parent" },
      { id: "c2", name: "David Cruz (Partner)", phone: "+63 920 987 6543", relationship: "Partner" },
    ],
    audioRecordingEnabled: true,
    shareTripToken: "RIDELIVE-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    driverVerificationDatabase: [
      { plate: "NBL-4821", driverName: "Carlos Mendoza", status: "Verified & Active", validUntil: "Dec 2027", safetyScore: 99 },
      { plate: "EVS-9012", driverName: "Elena Rostova", status: "Verified & Active", validUntil: "Aug 2027", safetyScore: 100 },
      { plate: "WXY-7731", driverName: "Mateo Cruz", status: "Verified & Active", validUntil: "Nov 2026", safetyScore: 97 },
      { plate: "TXG-5510", driverName: "Ramon Valenzuela", status: "Verified & Active", validUntil: "Mar 2027", safetyScore: 96 },
      { plate: "MC-88124", driverName: "Joshua Santos", status: "Verified & Active", validUntil: "Jun 2027", safetyScore: 98 },
    ],
  };

  if (typeof window === "undefined") return defaultSafety;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAFETY);
    return raw ? { ...defaultSafety, ...JSON.parse(raw) } : defaultSafety;
  } catch {
    return defaultSafety;
  }
}

export function loadDriverPortal(): DriverPortalState {
  const defaultPortal: DriverPortalState = {
    isOnline: true,
    driverName: "Alex Rivera",
    driverPhone: "+63 919 333 4455",
    vehicleModel: "Honda City 1.5 RS",
    licensePlate: "NDR-6620",
    rating: 4.95,
    completedTrips: 1320,
    acceptanceRate: 98.4,
    todayEarningsSda: 14.5,
    todayEarningsRide: 68.0,
    incomingRequests: [
      {
        id: "req_demo_1",
        passengerName: "Sophia Lim",
        pickup: "Robinsons Galleria, Ortigas",
        destination: "Rockwell Center, Makati",
        distanceKm: 6.2,
        proposedFare: 21.0,
        paymentMethod: "ride_token",
        expiresIn: 24,
      },
    ],
  };

  if (typeof window === "undefined") return defaultPortal;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRIVER_PORTAL);
    return raw ? { ...defaultPortal, ...JSON.parse(raw) } : defaultPortal;
  } catch {
    return defaultPortal;
  }
}

/**
 * Calculate realistic trip fare estimation
 */
export function calculateTripFare(
  pickup: string,
  destination: string,
  category: RideCategory,
  hasStop = false
) {
  // Approximate distance based on text length seeds for consistent UI demo
  const seed = (pickup.length * 3 + destination.length * 5) % 15;
  const distanceKm = Math.max(3.2, Math.round((4.5 + seed * 1.1) * 10) / 10);
  const durationMinutes = Math.round(distanceKm * 2.8 + (hasStop ? 6 : 0));

  let baseRate = 8.0; // base fare
  let perKm = 2.0;

  if (category === "comfort") {
    baseRate = 12.0;
    perKm = 2.8;
  } else if (category === "xl") {
    baseRate = 16.0;
    perKm = 3.6;
  } else if (category === "electric") {
    baseRate = 10.0;
    perKm = 2.2;
  } else if (category === "express") {
    baseRate = 5.0;
    perKm = 1.4;
  }

  const rawFare = baseRate + distanceKm * perKm + (hasStop ? 3.0 : 0);
  const roundedFare = Math.round(rawFare * 10) / 10;
  const tokenDiscount = Math.round(roundedFare * 0.15 * 10) / 10; // 15% discount for RIDE token
  const fareWithDiscount = Math.round((roundedFare - tokenDiscount) * 10) / 10;
  const estimatedRewards = Math.round(distanceKm * 1.5 * 100) / 100; // 1.5 RIDE per km

  return {
    distanceKm,
    durationMinutes,
    baseFare: roundedFare,
    recommendedOffer: roundedFare,
    tokenDiscount,
    fareWithDiscount,
    estimatedRewards,
  };
}

/**
 * Generate simulated driver bidding responses for InDrive-style negotiation
 */
export function generateSimulatedDriverOffers(
  passengerOffer: number,
  category: RideCategory,
  distanceKm: number
): DriverOffer[] {
  const matchingDrivers = INITIAL_NEARBY_DRIVERS.filter(
    (d) => d.vehicleType === category || category === "standard"
  );
  const pool = matchingDrivers.length > 0 ? matchingDrivers : INITIAL_NEARBY_DRIVERS;

  const fallbackDriver = INITIAL_NEARBY_DRIVERS[0]!;
  const d1: DriverInfo = pool[0] ?? fallbackDriver;
  const d2: DriverInfo = pool[1] ?? INITIAL_NEARBY_DRIVERS[1] ?? fallbackDriver;
  const d3: DriverInfo = pool[2] ?? INITIAL_NEARBY_DRIVERS[2] ?? fallbackDriver;

  return [
    {
      id: "bid_1",
      driver: d1,
      proposedFare: passengerOffer, // Accepted passenger's exact offer!
      etaMinutes: d1.etaMinutes,
      note: "Accepted your offer! Near you and ready to pick up immediately.",
      isCounterOffer: false,
      expiresInSeconds: 30,
    },
    {
      id: "bid_2",
      driver: d2,
      proposedFare: Math.round((passengerOffer * 1.12) * 10) / 10, // +12% counter offer
      etaMinutes: Math.max(1, d2.etaMinutes - 1),
      note: "Faster pickup in modern EV with cold AC & free phone charger.",
      isCounterOffer: true,
      expiresInSeconds: 30,
    },
    {
      id: "bid_3",
      driver: d3,
      proposedFare: Math.round((passengerOffer * 1.25) * 10) / 10, // Premium counter offer
      etaMinutes: d3.etaMinutes + 1,
      note: "Spacious premium vehicle, top-rated 5-star driver.",
      isCounterOffer: true,
      expiresInSeconds: 30,
    },
  ];
}

// ==============================================================
// Authoritative Real-Time Dispatch Backend Integration
// ==============================================================
export const BACKEND_API_BASE = "http://localhost:3001/api";

export async function checkBackendConnection(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${BACKEND_API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAuthoritativeNearbyDrivers(): Promise<DriverInfo[]> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/drivers/nearby`);
    if (res.ok) {
      const data = await res.json();
      if (data.drivers && data.drivers.length > 0) {
        return data.drivers.map((d: any, idx: number) => ({
          id: d.id,
          name: d.name,
          rating: d.rating,
          totalTrips: d.total_trips,
          vehicleModel: d.vehicle_model,
          vehicleType: d.vehicle_type,
          licensePlate: d.license_plate,
          color: d.vehicle_color || "Silver",
          phone: d.phone,
          distanceKm: 0.8 + idx * 0.6,
          etaMinutes: Math.max(2, Math.round((0.8 + idx * 0.6) * 2.5)),
          avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + idx * 1000}?w=150&auto=format&fit=crop&q=80`,
          isVerified: d.verification_status === "approved",
          backgroundCheckApproved: true,
          insuranceActive: true,
          coordinates: { x: 30 + (idx % 3) * 20, y: 35 + (idx % 2) * 25 },
        }));
      }
    }
  } catch (err) {
    console.warn("Could not fetch remote drivers, falling back to cached local set:", err);
  }
  return INITIAL_NEARBY_DRIVERS;
}

export async function createAuthoritativeRideOnServer(payload: {
  passengerAddress: string;
  pickupName: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffName: string;
  dropoffLat?: number;
  dropoffLng?: number;
  category: RideCategory;
  offeredFare: number;
  paymentMethod: PaymentMethod;
}): Promise<any> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/rides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passengerAddress: payload.passengerAddress,
        pickupName: payload.pickupName,
        pickupLat: payload.pickupLat || 14.5547,
        pickupLng: payload.pickupLng || 121.0244,
        dropoffName: payload.dropoffName,
        dropoffLat: payload.dropoffLat || 14.5505,
        dropoffLng: payload.dropoffLng || 121.0509,
        category: payload.category,
        offeredFare: payload.offeredFare,
        paymentMethod: payload.paymentMethod,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Backend ride creation failed, staying in local responsive mode:", e);
  }
  return null;
}
