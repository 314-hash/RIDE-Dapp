import { db } from "./db.js";
import { calculateRoadRoute, searchLocations } from "./osrm.js";
import crypto from "crypto";

// Default rate constants
export const BASE_FARE_RIDE = 3.5; // 3.5 RIDE base fee
export const PER_KM_RATE_RIDE = 1.2; // 1.2 RIDE per km
export const TOKEN_DISCOUNT_PERCENT = 0.15; // 15% discount for RIDE token

/**
 * Seed initial mock verified drivers if table is empty
 */
export function seedInitialDriversIfEmpty() {
  const countRow = db.prepare("SELECT COUNT(*) as count FROM drivers").get();
  if (countRow.count === 0) {
    console.log("[Dispatch] Seeding initial verified mobility drivers...");
    const initialDrivers = [
      {
        id: "driver-001",
        address: "0x3B64E2b3c220f1De164d142E94b8eF85C913217e",
        name: "Carlos Mendoza",
        phone: "+63 917 555 0124",
        license_plate: "NCL-8921",
        vehicle_model: "Toyota Corolla Altis Hybrid",
        vehicle_type: "standard",
        vehicle_color: "Midnight Blue",
        tier: "Diamond",
        staked_amount: "300000000000000000000", // 300 RIDE
        fee_bps: 200, // 2%
        rating: 4.96,
        total_trips: 1482,
        verification_status: "approved",
        is_online: 1,
        last_lat: 14.5552,
        last_lng: 121.0238,
      },
      {
        id: "driver-002",
        address: "0x892a065Ac45cDE800DE9725f7F7C73aDe9b7217e",
        name: "Sarah De Guzman",
        phone: "+63 928 555 0891",
        license_plate: "NBD-4512",
        vehicle_model: "BYD Atto 3 EV",
        vehicle_type: "electric",
        vehicle_color: "Alpine White",
        tier: "Gold",
        staked_amount: "150000000000000000000", // 150 RIDE
        fee_bps: 450, // 4.5%
        rating: 4.92,
        total_trips: 874,
        verification_status: "approved",
        is_online: 1,
        last_lat: 14.5512,
        last_lng: 121.0495,
      },
      {
        id: "driver-003",
        address: "0x1Fa9C3B6187900b12DE394aee91148674d8D217e",
        name: "Mateo Reyes",
        phone: "+63 905 555 4412",
        license_plate: "CAE-7731",
        vehicle_model: "Honda CR-V Turbo",
        vehicle_type: "comfort",
        vehicle_color: "Modern Steel",
        tier: "Silver",
        staked_amount: "75000000000000000000", // 75 RIDE
        fee_bps: 600, // 6%
        rating: 4.88,
        total_trips: 412,
        verification_status: "approved",
        is_online: 1,
        last_lat: 14.5875,
        last_lng: 121.0621,
      },
    ];

    const insertStmt = db.prepare(`
      INSERT INTO drivers (
        id, address, name, phone, license_plate, vehicle_model, vehicle_type, vehicle_color,
        tier, staked_amount, fee_bps, rating, total_trips, verification_status,
        is_online, last_lat, last_lng, last_location_time, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    for (const d of initialDrivers) {
      insertStmt.run(
        d.id,
        d.address.toLowerCase(),
        d.name,
        d.phone,
        d.license_plate,
        d.vehicle_model,
        d.vehicle_type,
        d.vehicle_color,
        d.tier,
        d.staked_amount,
        d.fee_bps,
        d.rating,
        d.total_trips,
        d.verification_status,
        d.is_online,
        d.last_lat,
        d.last_lng,
        now,
        now,
        now
      );

      // Seed approved document for driver
      db.prepare(`
        INSERT INTO driver_documents (
          id, driver_id, doc_type, doc_number, status, verified_by, uploaded_at, updated_at
        ) VALUES (?, ?, 'driver_license', 'DL-APPROVED-VALID', 'approved', 'protocol_admin', ?, ?)
      `).run(`doc-${d.id}-dl`, d.id, now, now);
    }
  }
}

/**
 * Create a new authoritative ride request
 */
export async function createRideRequest(payload) {
  const {
    passengerAddress,
    pickupName,
    pickupLat,
    pickupLng,
    dropoffName,
    dropoffLat,
    dropoffLng,
    category = "standard",
    passengersCount = 1,
    offeredFare = null,
    paymentMethod = "ride_token",
  } = payload;

  if (!passengerAddress || !pickupName || !dropoffName) {
    throw new Error("Missing mandatory ride fields (passengerAddress, pickupName, dropoffName)");
  }

  // Calculate road route and distance via OSRM
  const routeData = await calculateRoadRoute(
    Number(pickupLat),
    Number(pickupLng),
    Number(dropoffLat),
    Number(dropoffLng)
  );

  const distanceKm = routeData.distanceKm;
  const durationMinutes = routeData.durationMinutes;

  // Compute fare
  const computedBaseFare = Number((BASE_FARE_RIDE + distanceKm * PER_KM_RATE_RIDE).toFixed(2));
  let userOfferedFare = offeredFare ? Number(Number(offeredFare).toFixed(2)) : computedBaseFare;

  let tokenDiscountApplied = 0;
  let tokenDiscountAmount = 0;
  let finalFare = userOfferedFare;

  if (paymentMethod === "ride_token") {
    tokenDiscountApplied = 1;
    tokenDiscountAmount = Number((userOfferedFare * TOKEN_DISCOUNT_PERCENT).toFixed(2));
    finalFare = Number((userOfferedFare - tokenDiscountAmount).toFixed(2));
  }

  const rideId = "ride_" + crypto.randomBytes(8).toString("hex");
  const onChainTripId = "0x" + crypto.createHash("sha256").update(rideId + Date.now()).digest("hex");
  const now = Date.now();

  const insertRide = db.prepare(`
    INSERT INTO rides (
      id, on_chain_trip_id, passenger_address, pickup_name, pickup_lat, pickup_lng,
      dropoff_name, dropoff_lat, dropoff_lng, category, passengers_count,
      distance_km, duration_minutes, base_fare, offered_fare, final_fare,
      payment_method, token_discount_applied, token_discount_amount, status,
      route_geometry, current_progress, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'REQUESTED', ?, 0, ?, ?)
  `);

  insertRide.run(
    rideId,
    onChainTripId,
    passengerAddress.toLowerCase(),
    pickupName,
    Number(pickupLat),
    Number(pickupLng),
    dropoffName,
    Number(dropoffLat),
    Number(dropoffLng),
    category,
    Number(passengersCount),
    distanceKm,
    durationMinutes,
    computedBaseFare,
    userOfferedFare,
    finalFare,
    paymentMethod,
    tokenDiscountApplied,
    tokenDiscountAmount,
    JSON.stringify(routeData.geometry),
    now,
    now
  );

  return getRideById(rideId);
}

/**
 * Retrieve ride with active bids
 */
export function getRideById(rideId) {
  const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId);
  if (!ride) return null;

  // Parse geometry
  if (ride.route_geometry) {
    try {
      ride.geometry = JSON.parse(ride.route_geometry);
    } catch {
      ride.geometry = [];
    }
  }

  // Get active driver bids
  const bids = db.prepare("SELECT * FROM driver_bids WHERE ride_id = ? ORDER BY created_at DESC").all(rideId);
  ride.bids = bids;

  // Get matched driver info if assigned
  if (ride.driver_address) {
    const driver = db.prepare("SELECT * FROM drivers WHERE address = ?").get(ride.driver_address.toLowerCase());
    ride.driver = driver || null;
  } else {
    ride.driver = null;
  }

  return ride;
}

/**
 * Submit driver counter-offer or fare bid
 */
export function submitDriverBid(rideId, driverAddress, proposedFare, etaMinutes = 5, note = "") {
  const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId);
  if (!ride) throw new Error("Ride not found");
  if (ride.status !== "REQUESTED" && ride.status !== "BIDDING") {
    throw new Error(`Ride is no longer accepting bids (status: ${ride.status})`);
  }

  const driver = db.prepare("SELECT * FROM drivers WHERE address = ?").get(driverAddress.toLowerCase());
  if (!driver) throw new Error("Driver not registered");
  if (driver.verification_status !== "approved") {
    throw new Error("Driver documents are pending verification");
  }

  const bidId = "bid_" + crypto.randomBytes(6).toString("hex");
  const now = Date.now();
  const expiresAt = now + 45 * 1000; // 45 second bid expiry window

  // Check if driver already has an active bid
  const existing = db.prepare("SELECT id FROM driver_bids WHERE ride_id = ? AND driver_address = ? AND status = 'PENDING'").get(rideId, driverAddress.toLowerCase());
  if (existing) {
    db.prepare("UPDATE driver_bids SET proposed_fare = ?, eta_minutes = ?, note = ?, expires_at = ? WHERE id = ?")
      .run(Number(proposedFare), Number(etaMinutes), note, expiresAt, existing.id);
  } else {
    db.prepare(`
      INSERT INTO driver_bids (
        id, ride_id, driver_address, driver_name, driver_rating, driver_tier,
        proposed_fare, eta_minutes, note, status, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    `).run(
      bidId,
      rideId,
      driverAddress.toLowerCase(),
      driver.name,
      driver.rating,
      driver.tier,
      Number(proposedFare),
      Number(etaMinutes),
      note,
      expiresAt,
      now
    );
  }

  // Update ride status to BIDDING
  db.prepare("UPDATE rides SET status = 'BIDDING', updated_at = ? WHERE id = ? AND status = 'REQUESTED'")
    .run(now, rideId);

  return getRideById(rideId);
}

/**
 * ATOMIC DRIVER ACCEPTANCE
 * Concurrency guard: Uses atomic SQL update to prevent competing drivers accepting the same ride
 */
export function acceptDriverBid(rideId, bidId, passengerAddress) {
  const now = Date.now();

  const bid = db.prepare("SELECT * FROM driver_bids WHERE id = ? AND ride_id = ?").get(bidId, rideId);
  if (!bid) throw new Error("Bid not found or expired");
  if (bid.status !== "PENDING") throw new Error(`Bid is already ${bid.status}`);
  if (bid.expires_at < now) {
    db.prepare("UPDATE driver_bids SET status = 'EXPIRED' WHERE id = ?").run(bidId);
    throw new Error("Bid has expired");
  }

  // ATOMIC LOCK: Update ride only if still in REQUESTED or BIDDING status
  const updateRide = db.prepare(`
    UPDATE rides 
    SET status = 'ACCEPTED', 
        driver_address = ?, 
        final_fare = ?, 
        updated_at = ?
    WHERE id = ? 
      AND passenger_address = ? 
      AND status IN ('REQUESTED', 'BIDDING')
  `);

  const result = updateRide.run(
    bid.driver_address.toLowerCase(),
    bid.proposed_fare,
    now,
    rideId,
    passengerAddress.toLowerCase()
  );

  if (result.changes === 0) {
    throw new Error("Conflict: Ride was already accepted or locked by another transaction");
  }

  // Mark accepted bid
  db.prepare("UPDATE driver_bids SET status = 'ACCEPTED' WHERE id = ?").run(bidId);
  // Mark all other competing bids as REJECTED
  db.prepare("UPDATE driver_bids SET status = 'REJECTED' WHERE ride_id = ? AND id != ?").run(rideId, bidId);

  return getRideById(rideId);
}

/**
 * Update ride lifecycle status with server-side transition validation
 */
export function updateRideStatus(rideId, newStatus, callerAddress, metadata = {}) {
  const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId);
  if (!ride) throw new Error("Ride not found");

  const allowedTransitions = {
    REQUESTED: ["BIDDING", "ACCEPTED", "CANCELLED"],
    BIDDING: ["ACCEPTED", "CANCELLED"],
    ACCEPTED: ["ARRIVING", "CANCELLED", "DISPUTED"],
    ARRIVING: ["IN_TRANSIT", "CANCELLED", "DISPUTED"],
    IN_TRANSIT: ["COMPLETED", "DISPUTED"],
    COMPLETED: [],
    CANCELLED: [],
    DISPUTED: ["COMPLETED", "CANCELLED"],
  };

  const validNext = allowedTransitions[ride.status] || [];
  if (!validNext.includes(newStatus)) {
    throw new Error(`Invalid lifecycle transition from ${ride.status} to ${newStatus}`);
  }

  const now = Date.now();
  let query = "UPDATE rides SET status = ?, updated_at = ?";
  const params = [newStatus, now];

  if (metadata.cancellationReason) {
    query += ", cancellation_reason = ?";
    params.push(metadata.cancellationReason);
  }
  if (metadata.disputeReason) {
    query += ", dispute_reason = ?";
    params.push(metadata.disputeReason);
  }
  if (metadata.txHash) {
    query += ", tx_hash = ?";
    params.push(metadata.txHash);
  }
  if (metadata.settlementTxHash) {
    query += ", settlement_tx_hash = ?";
    params.push(metadata.settlementTxHash);
  }
  if (metadata.earnedRewards) {
    query += ", earned_rewards = ?";
    params.push(Number(metadata.earnedRewards));
  }
  if (metadata.progressPercent !== undefined) {
    query += ", current_progress = ?";
    params.push(Number(metadata.progressPercent));
  }

  query += " WHERE id = ?";
  params.push(rideId);

  db.prepare(query).run(...params);

  // If completed, increment driver trip stats
  if (newStatus === "COMPLETED" && ride.driver_address) {
    db.prepare("UPDATE drivers SET total_trips = total_trips + 1 WHERE address = ?")
      .run(ride.driver_address.toLowerCase());
  }

  return getRideById(rideId);
}

/**
 * Record driver GPS breadcrumb and update current location
 */
export function recordDriverLocation(driverAddress, lat, lng, speed = 0, heading = 0, rideId = null) {
  const now = Date.now();
  db.prepare(`
    UPDATE drivers 
    SET last_lat = ?, last_lng = ?, last_location_time = ?, updated_at = ? 
    WHERE address = ?
  `).run(Number(lat), Number(lng), now, now, driverAddress.toLowerCase());

  if (rideId) {
    db.prepare(`
      INSERT INTO location_breadcrumbs (ride_id, driver_address, lat, lng, speed_kmh, heading, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(rideId, driverAddress.toLowerCase(), Number(lat), Number(lng), Number(speed), Number(heading), now);
  }

  return { driverAddress, lat, lng, timestamp: now };
}

/**
 * Trigger emergency SOS alert
 */
export function triggerSosAlert(rideId, senderAddress, senderRole, lat, lng, details = "") {
  const alertId = "sos_" + crypto.randomBytes(6).toString("hex");
  const now = Date.now();

  db.prepare(`
    INSERT INTO sos_alerts (
      id, ride_id, sender_address, sender_role, lat, lng, escalation_level, status, delivery_confirmed, details, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'CRITICAL_DISPATCH', 'ACTIVE', 1, ?, ?)
  `).run(
    alertId,
    rideId,
    senderAddress.toLowerCase(),
    senderRole,
    Number(lat || 0),
    Number(lng || 0),
    details,
    now
  );

  return {
    alertId,
    rideId,
    senderAddress,
    status: "DISPATCH_CONFIRMED",
    timestamp: now,
    message: "SOS alert broadcast to Sidra emergency response unit & verified safety contacts.",
  };
}

/**
 * Register or update driver documentation workflow
 */
export function submitDriverApplication(data) {
  const { address, name, phone, licensePlate, vehicleModel, vehicleType, vehicleColor, docNumber } = data;
  if (!address || !name || !licensePlate) {
    throw new Error("Missing required driver registration details");
  }

  const existing = db.prepare("SELECT id FROM drivers WHERE address = ?").get(address.toLowerCase());
  const now = Date.now();
  let driverId = existing ? existing.id : "driver_" + crypto.randomBytes(6).toString("hex");

  if (existing) {
    db.prepare(`
      UPDATE drivers 
      SET name = ?, phone = ?, license_plate = ?, vehicle_model = ?, vehicle_type = ?, vehicle_color = ?, updated_at = ?
      WHERE address = ?
    `).run(name, phone, licensePlate, vehicleModel, vehicleType, vehicleColor, now, address.toLowerCase());
  } else {
    db.prepare(`
      INSERT INTO drivers (
        id, address, name, phone, license_plate, vehicle_model, vehicle_type, vehicle_color,
        tier, staked_amount, fee_bps, rating, total_trips, verification_status, is_online, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Standard', '0', 800, 5.0, 0, 'pending', 0, ?, ?)
    `).run(driverId, address.toLowerCase(), name, phone, licensePlate, vehicleModel, vehicleType, vehicleColor || "Silver", now, now);
  }

  // Record document upload
  if (docNumber) {
    const docId = "doc_" + crypto.randomBytes(6).toString("hex");
    db.prepare(`
      INSERT INTO driver_documents (id, driver_id, doc_type, doc_number, status, uploaded_at, updated_at)
      VALUES (?, ?, 'driver_license', ?, 'pending', ?, ?)
    `).run(docId, driverId, docNumber, now, now);
  }

  return db.prepare("SELECT * FROM drivers WHERE address = ?").get(address.toLowerCase());
}

/**
 * Admin: Approve or reject driver documents
 */
export function verifyDriverDocument(docId, status, adminAddress, rejectionReason = "") {
  const now = Date.now();
  const doc = db.prepare("SELECT * FROM driver_documents WHERE id = ?").get(docId);
  if (!doc) throw new Error("Document not found");

  db.prepare(`
    UPDATE driver_documents 
    SET status = ?, verified_by = ?, rejection_reason = ?, updated_at = ? 
    WHERE id = ?
  `).run(status, adminAddress, rejectionReason, now, docId);

  // If approved, update driver overall status
  if (status === "approved") {
    db.prepare("UPDATE drivers SET verification_status = 'approved', updated_at = ? WHERE id = ?")
      .run(now, doc.driver_id);
  } else if (status === "rejected") {
    db.prepare("UPDATE drivers SET verification_status = 'rejected', updated_at = ? WHERE id = ?")
      .run(now, doc.driver_id);
  }

  return db.prepare("SELECT * FROM driver_documents WHERE id = ?").get(docId);
}
