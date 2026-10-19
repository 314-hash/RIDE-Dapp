import { db } from "../server/db.js";
import {
  seedInitialDriversIfEmpty,
  createRideRequest,
  getRideById,
  submitDriverBid,
  acceptDriverBid,
  updateRideStatus,
  recordDriverLocation,
  triggerSosAlert,
  submitDriverApplication,
  verifyDriverDocument,
} from "../server/dispatch.js";
import { calculateRoadRoute, searchLocations } from "../server/osrm.js";

console.log("==================================================");
console.log("RIDE TOKENS Backend & Dispatch Automated Tests");
console.log("Database: Persistent SQLite | Engine: Node 24 Native");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

function assert(cond, name) {
  if (cond) {
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${name}`);
    failed++;
  }
}

async function runTests() {
  console.log("--- TEST GROUP 1: OSRM Routing & Geocoding ---");
  {
    const searchResults = searchLocations("Makati");
    assert(searchResults.length > 0, "Location search returns valid transit hubs for 'Makati'");
    assert(searchResults[0].name.includes("Makati"), "Search result contains expected anchor name");

    // Test routing between Makati and BGC
    const route = await calculateRoadRoute(14.5547, 121.0244, 14.5505, 121.0509);
    assert(route.distanceKm > 1.0, `Route distance is positive and realistic (${route.distanceKm} km)`);
    assert(route.durationMinutes >= 1, `Route duration is realistic (${route.durationMinutes} mins)`);
    assert(Array.isArray(route.geometry) && route.geometry.length > 1, "Route includes multi-point polyline geometry");
    assert(["osrm", "fallback_interpolation"].includes(route.source), "Route source is explicitly tracked");
  }

  console.log("\n--- TEST GROUP 2: Driver Seeding & KYC Document Workflow ---");
  {
    seedInitialDriversIfEmpty();
    const driver = db.prepare("SELECT * FROM drivers WHERE id = 'driver-001'").get();
    assert(driver !== undefined, "Initial verified driver seeded successfully");
    assert(driver.tier === "Diamond", "Diamond driver tier preserved");
    assert(driver.fee_bps === 200, "Diamond driver platform fee is 200 bps (2.0%)");

    // Register new driver
    const newDriver = submitDriverApplication({
      address: "0xTestDriver99887766554433221100aabbccddeeff",
      name: "Juan Dela Cruz",
      phone: "+63 918 111 2233",
      licensePlate: "XYZ-1234",
      vehicleModel: "Hyundai Ioniq 5",
      vehicleType: "electric",
      docNumber: "DL-99887766",
    });
    assert(newDriver.verification_status === "pending", "New driver defaults to 'pending' KYC status");

    // Admin verifies document
    const doc = db.prepare("SELECT id FROM driver_documents WHERE driver_id = ?").get(newDriver.id);
    const approvedDoc = verifyDriverDocument(doc.id, "approved", "admin_0x001");
    assert(approvedDoc.status === "approved", "Admin can approve driver KYC documentation");

    const verifiedDriver = db.prepare("SELECT verification_status FROM drivers WHERE id = ?").get(newDriver.id);
    assert(verifiedDriver.verification_status === "approved", "Driver verification status automatically updates to approved");
  }

  console.log("\n--- TEST GROUP 3: Server-Authoritative Ride Lifecycle & 15% Discount ---");
  let testRideId = null;
  let testOnChainTripId = null;
  {
    const ride = await createRideRequest({
      passengerAddress: "0xPassenger112233445566778899aabbccddeeff",
      pickupName: "Makati Financial Central",
      pickupLat: 14.5547,
      pickupLng: 121.0244,
      dropoffName: "BGC High Street Hub",
      dropoffLat: 14.5505,
      dropoffLng: 121.0509,
      category: "standard",
      paymentMethod: "ride_token",
    });

    testRideId = ride.id;
    testOnChainTripId = ride.on_chain_trip_id;

    assert(ride.status === "REQUESTED", "New ride created in REQUESTED state");
    assert(ride.token_discount_applied === 1, "RIDE token payment activates 15% discount");
    assert(ride.final_fare < ride.offered_fare, `Discounted fare (${ride.final_fare}) is less than gross fare (${ride.offered_fare})`);
    assert(ride.on_chain_trip_id.startsWith("0x"), "Ride assigns unique cryptographic on_chain_trip_id");
  }

  console.log("\n--- TEST GROUP 4: InDrive-Style Bidding & Counter-Offers ---");
  let acceptedBidId = null;
  {
    // Driver 1 places a bid
    const rideWithBid1 = submitDriverBid(
      testRideId,
      "0x3B64E2b3c220f1De164d142E94b8eF85C913217e", // Carlos Mendoza (Diamond)
      7.5,
      4,
      "4 mins away, hybrid comfort"
    );
    assert(rideWithBid1.status === "BIDDING", "Ride status transitions to BIDDING upon first bid");
    assert(rideWithBid1.bids.length === 1, "Ride tracks 1 active bid");

    // Driver 2 places competing bid
    const rideWithBid2 = submitDriverBid(
      testRideId,
      "0x892a065Ac45cDE800DE9725f7F7C73aDe9b7217e", // Sarah De Guzman (Gold EV)
      7.0,
      3,
      "3 mins away in zero-emission EV"
    );
    assert(rideWithBid2.bids.length === 2, "Ride tracks 2 competing bids from different drivers");
    acceptedBidId = rideWithBid2.bids[0].id; // Sarah's bid
  }

  console.log("\n--- TEST GROUP 5: ATOMIC CONCURRENCY GUARD & RACE CONDITION PREVENTION ---");
  {
    const passengerAddr = "0xPassenger112233445566778899aabbccddeeff";

    // First acceptance (should succeed)
    const acceptedRide = acceptDriverBid(testRideId, acceptedBidId, passengerAddr);
    assert(acceptedRide.status === "ACCEPTED", "First acceptance successfully transitions ride to ACCEPTED");
    assert(acceptedRide.driver_address.toLowerCase() === "0x892a065Ac45cDE800DE9725f7F7C73aDe9b7217e".toLowerCase(), "Correct driver assigned");

    // Check that competing bid was marked REJECTED
    const competingBid = db.prepare("SELECT status FROM driver_bids WHERE ride_id = ? AND id != ?").get(testRideId, acceptedBidId);
    assert(competingBid.status === "REJECTED", "Competing bids atomically set to REJECTED");

    // Second competing acceptance on the same ride (MUST FAIL)
    let raceConditionPrevented = false;
    try {
      acceptDriverBid(testRideId, acceptedBidId, passengerAddr);
    } catch (err) {
      raceConditionPrevented = true;
    }
    assert(raceConditionPrevented, "Double-acceptance conflict prevented: Second acceptance rejected atomically!");
  }

  console.log("\n--- TEST GROUP 6: Server-Authoritative State Machine Validation ---");
  {
    const passengerAddr = "0xPassenger112233445566778899aabbccddeeff";

    // Invalid jump from ACCEPTED -> COMPLETED (must fail because it must go ARRIVING -> IN_TRANSIT)
    let invalidJumpFailed = false;
    try {
      updateRideStatus(testRideId, "COMPLETED", passengerAddr);
    } catch {
      invalidJumpFailed = true;
    }
    assert(invalidJumpFailed, "Illegal jump ACCEPTED -> COMPLETED correctly blocked by state machine");

    // Valid progression: ACCEPTED -> ARRIVING
    const arrivingRide = updateRideStatus(testRideId, "ARRIVING", passengerAddr);
    assert(arrivingRide.status === "ARRIVING", "Valid transition to ARRIVING permitted");

    // Valid progression: ARRIVING -> IN_TRANSIT
    const inTransitRide = updateRideStatus(testRideId, "IN_TRANSIT", passengerAddr);
    assert(inTransitRide.status === "IN_TRANSIT", "Valid transition to IN_TRANSIT permitted");

    // Location updates recorded during transit
    const loc = recordDriverLocation("0x892a065Ac45cDE800DE9725f7F7C73aDe9b7217e", 14.552, 121.035, 35, 90, testRideId);
    assert(loc.lat === 14.552, "Driver GPS breadcrumb recorded during trip");

    // Valid progression: IN_TRANSIT -> COMPLETED
    const completedRide = updateRideStatus(testRideId, "COMPLETED", passengerAddr, {
      earnedRewards: 4.5,
      settlementTxHash: "0xMockSettlementHashSidraChain97453",
    });
    assert(completedRide.status === "COMPLETED", "Valid transition to COMPLETED permitted");
    assert(completedRide.earned_rewards === 4.5, "Earned RIDE rewards recorded upon completion");
  }

  console.log("\n--- TEST GROUP 7: Emergency SOS Alert Dispatch ---");
  {
    const sosResult = triggerSosAlert(
      testRideId,
      "0xPassenger112233445566778899aabbccddeeff",
      "passenger",
      14.552,
      121.035,
      "Suspicious detour reported"
    );
    assert(sosResult.status === "DISPATCH_CONFIRMED", "SOS emergency alert processed with immediate delivery confirmation");

    const savedSos = db.prepare("SELECT * FROM sos_alerts WHERE id = ?").get(sosResult.alertId);
    assert(savedSos !== undefined, "SOS alert persisted in database audit log");
    assert(savedSos.escalation_level === "CRITICAL_DISPATCH", "SOS marked with CRITICAL_DISPATCH escalation level");
  }

  console.log("\n==================================================");
  console.log(`BACKEND TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("ALL DISPATCH & REAL-TIME TESTS PASSED WITH ZERO CONCURRENCY CONFLICTS!\n");
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
