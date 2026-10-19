import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

import { db } from "./db.js";
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
} from "./dispatch.js";
import { calculateRoadRoute, searchLocations } from "./osrm.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;
const CHAIN_ID = Number(process.env.CHAIN_ID) || 97453;
const RPC_URL = process.env.RPC_URL || "https://rpc.sidrachain.com";
const RIDE_TOKEN_ADDRESS = process.env.RIDE_ADDRESS || "0xe91cAC00C1092611EB598B284a87A623a35aF9b7";

app.use(cors());
app.use(express.json());

// Seed initial drivers
seedInitialDriversIfEmpty();

// Periodic task to expire outdated driver bids (every 10 seconds)
setInterval(() => {
  const now = Date.now();
  const expired = db.prepare("UPDATE driver_bids SET status = 'EXPIRED' WHERE status = 'PENDING' AND expires_at < ?").run(now);
  if (expired.changes > 0) {
    // Notify clients of updated bids
    io.emit("bids:pruned", { timestamp: now });
  }
}, 10000);

// --- REST API ROUTES ---

// Health & Network Status
app.get("/api/health", (req, res) => {
  try {
    const totalRides = db.prepare("SELECT COUNT(*) as c FROM rides").get().c;
    const activeDrivers = db.prepare("SELECT COUNT(*) as c FROM drivers WHERE is_online = 1").get().c;

    res.json({
      status: "healthy",
      service: "RIDE TOKENS Dispatch Engine",
      network: "Sidra Chain",
      chainId: CHAIN_ID,
      rpc: RPC_URL,
      rideToken: RIDE_TOKEN_ADDRESS,
      database: "Persistent SQLite (ACID)",
      metrics: {
        totalRides,
        activeDrivers,
      },
      timestamp: Date.now(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protocol Contracts & Network Configuration
app.get("/api/blockchain/protocol", (req, res) => {
  try {
    const configPath = path.resolve("./config/protocol_contracts.json");
    let protocolConfig = {};
    if (fs.existsSync(configPath)) {
      protocolConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }

    res.json({
      chainId: CHAIN_ID,
      chainIdHex: "0x" + CHAIN_ID.toString(16),
      network: "Sidra Chain",
      rpcUrl: RPC_URL,
      explorerUrl: "https://ledger.sidrachain.com",
      nativeCurrency: { name: "Sidra Digital Asset", symbol: "SDA", decimals: 18 },
      rideTokenAddress: RIDE_TOKEN_ADDRESS,
      ridePoolAddress: "0x4a65a79dbC3e0184972e041525eDeeAb481c6027",
      contracts: protocolConfig.contracts || {},
      deployedAt: protocolConfig.deployedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Geocoding & Transit Locations Search
app.get("/api/locations/search", (req, res) => {
  const query = req.query.q || "";
  const results = searchLocations(query);
  res.json({ query, results });
});

// OSRM Road Route Geometry & Duration
app.post("/api/routing/route", async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng } = req.body;
    const route = await calculateRoadRoute(
      Number(pickupLat),
      Number(pickupLng),
      Number(dropoffLat),
      Number(dropoffLng)
    );
    res.json(route);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List Available Nearby Drivers
app.get("/api/drivers/nearby", (req, res) => {
  try {
    const drivers = db.prepare(`
      SELECT id, address, name, phone, license_plate, vehicle_model, vehicle_type, vehicle_color,
             tier, staked_amount, fee_bps, rating, total_trips, verification_status,
             is_online, last_lat, last_lng, last_location_time
      FROM drivers 
      WHERE is_online = 1 AND verification_status = 'approved'
      LIMIT 10
    `).all();

    res.json({ drivers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Ride Request
app.post("/api/rides", async (req, res) => {
  try {
    const ride = await createRideRequest(req.body);
    // Broadcast to online drivers room
    io.to("drivers:available").emit("ride:new_request", ride);
    res.status(201).json(ride);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Ride State
app.get("/api/rides/:id", (req, res) => {
  try {
    const ride = getRideById(req.params.id);
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Driver Proposes Counter-Offer / Bid
app.post("/api/rides/:id/bids", (req, res) => {
  try {
    const { driverAddress, proposedFare, etaMinutes, note } = req.body;
    const ride = submitDriverBid(req.params.id, driverAddress, proposedFare, etaMinutes, note);

    // Notify passenger room of new bid
    io.to(`ride:${req.params.id}`).emit("ride:bid_received", ride);
    io.to(`passenger:${ride.passenger_address}`).emit("passenger:bid_update", ride);

    res.status(201).json(ride);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ATOMIC Passenger Bid Acceptance
app.post("/api/rides/:id/accept_bid", (req, res) => {
  try {
    const { bidId, passengerAddress } = req.body;
    const updatedRide = acceptDriverBid(req.params.id, bidId, passengerAddress);

    // Notify ride room and driver
    io.to(`ride:${req.params.id}`).emit("ride:matched", updatedRide);
    io.to(`driver:${updatedRide.driver_address}`).emit("driver:ride_assigned", updatedRide);

    res.json(updatedRide);
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

// Lifecycle Status Transition
app.post("/api/rides/:id/status", (req, res) => {
  try {
    const { status, callerAddress, metadata } = req.body;
    const updatedRide = updateRideStatus(req.params.id, status, callerAddress, metadata);

    // Broadcast updated status
    io.to(`ride:${req.params.id}`).emit("ride:status_changed", updatedRide);
    res.json(updatedRide);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Driver Application Submission
app.post("/api/driver/apply", (req, res) => {
  try {
    const driver = submitDriverApplication(req.body);
    res.status(201).json({ success: true, driver });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Document Verification
app.post("/api/driver/verify_document", (req, res) => {
  try {
    const { docId, status, adminAddress, rejectionReason } = req.body;
    const doc = verifyDriverDocument(docId, status, adminAddress, rejectionReason);
    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Emergency SOS Trigger
app.post("/api/sos", (req, res) => {
  try {
    const { rideId, senderAddress, senderRole, lat, lng, details } = req.body;
    const alert = triggerSosAlert(rideId, senderAddress, senderRole, lat, lng, details);

    // High-priority broadcast
    io.to(`ride:${rideId}`).emit("sos:broadcast", alert);
    io.emit("admin:emergency_alert", alert);

    res.status(201).json(alert);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- SOCKET.IO REAL-TIME EVENT HANDLERS ---
io.on("connection", (socket) => {
  // Join Ride Room
  socket.on("ride:join", ({ rideId }) => {
    if (rideId) {
      socket.join(`ride:${rideId}`);
    }
  });

  // Join Passenger Notification Channel
  socket.on("passenger:join", ({ passengerAddress }) => {
    if (passengerAddress) {
      socket.join(`passenger:${passengerAddress.toLowerCase()}`);
    }
  });

  // Register Driver Presence
  socket.on("driver:register", ({ driverAddress }) => {
    if (driverAddress) {
      socket.join(`driver:${driverAddress.toLowerCase()}`);
      socket.join("drivers:available");
      db.prepare("UPDATE drivers SET is_online = 1 WHERE address = ?").run(driverAddress.toLowerCase());
    }
  });

  // Live Driver Location Broadcast with Throttling & Staleness check
  socket.on("driver:location_telemetry", ({ driverAddress, rideId, lat, lng, speed, heading }) => {
    if (driverAddress && lat && lng) {
      const recorded = recordDriverLocation(driverAddress, lat, lng, speed, heading, rideId);
      if (rideId) {
        // Push live coordinate breadcrumb to passenger in ride room
        socket.to(`ride:${rideId}`).emit("driver:location_update", recorded);
      }
    }
  });

  socket.on("disconnect", () => {
    // Client disconnected
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`RIDE TOKENS Real-Time Dispatch Server Running`);
  console.log(`Port: ${PORT} | Target Network: Sidra Chain (${CHAIN_ID})`);
  console.log(`Persistent Database: ./data/ride_dispatch.sqlite`);
  console.log(`REST API: http://localhost:${PORT}/api/health`);
  console.log(`WebSocket Engine: Socket.IO enabled`);
  console.log(`==================================================\n`);
});

export { app, server };
