import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

// Ensure data directory exists
const dataDir = path.resolve("./data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "ride_dispatch.sqlite");
console.log(`[DB] Initializing SQLite database at: ${dbPath}`);

export const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high-performance concurrent read/write
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// Initialize Schema
db.exec(`
  -- Users table (passenger / driver / admin)
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    address TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'passenger',
    display_name TEXT,
    phone TEXT,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
  );

  -- Drivers profile & staking tier cache
  CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    address TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    license_plate TEXT NOT NULL,
    vehicle_model TEXT NOT NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'standard',
    vehicle_color TEXT DEFAULT 'Silver',
    tier TEXT NOT NULL DEFAULT 'Standard',
    staked_amount TEXT NOT NULL DEFAULT '0',
    fee_bps INTEGER NOT NULL DEFAULT 800,
    rating REAL NOT NULL DEFAULT 5.0,
    total_trips INTEGER NOT NULL DEFAULT 0,
    verification_status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    is_online INTEGER NOT NULL DEFAULT 0,
    last_lat REAL DEFAULT 0,
    last_lng REAL DEFAULT 0,
    last_location_time INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Driver KYC / Vehicle Documents
  CREATE TABLE IF NOT EXISTS driver_documents (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    doc_type TEXT NOT NULL, -- driver_license, vehicle_insurance, registration, background_check
    doc_number TEXT NOT NULL,
    file_reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    verified_by TEXT,
    uploaded_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(driver_id) REFERENCES drivers(id) ON DELETE CASCADE
  );

  -- Authoritative Rides table
  CREATE TABLE IF NOT EXISTS rides (
    id TEXT PRIMARY KEY,
    on_chain_trip_id TEXT UNIQUE,
    passenger_address TEXT NOT NULL,
    driver_address TEXT,
    pickup_name TEXT NOT NULL,
    pickup_lat REAL NOT NULL,
    pickup_lng REAL NOT NULL,
    dropoff_name TEXT NOT NULL,
    dropoff_lat REAL NOT NULL,
    dropoff_lng REAL NOT NULL,
    category TEXT NOT NULL DEFAULT 'standard',
    passengers_count INTEGER NOT NULL DEFAULT 1,
    distance_km REAL NOT NULL,
    duration_minutes INTEGER NOT NULL,
    base_fare REAL NOT NULL,
    offered_fare REAL NOT NULL,
    final_fare REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'ride_token', -- ride_token, sda, cash
    token_discount_applied INTEGER NOT NULL DEFAULT 1,
    token_discount_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, BIDDING, ACCEPTED, ARRIVING, IN_TRANSIT, COMPLETED, CANCELLED, DISPUTED
    cancellation_reason TEXT,
    dispute_reason TEXT,
    route_geometry TEXT, -- JSON array of coordinates [ [lng, lat], ... ]
    current_progress REAL NOT NULL DEFAULT 0,
    tx_hash TEXT,
    settlement_tx_hash TEXT,
    earned_rewards REAL DEFAULT 0,
    rating INTEGER,
    review TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Real-time Driver Bids / Counter-Offers
  CREATE TABLE IF NOT EXISTS driver_bids (
    id TEXT PRIMARY KEY,
    ride_id TEXT NOT NULL,
    driver_address TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    driver_rating REAL NOT NULL,
    driver_tier TEXT NOT NULL,
    proposed_fare REAL NOT NULL,
    eta_minutes INTEGER NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED, EXPIRED
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(ride_id) REFERENCES rides(id) ON DELETE CASCADE
  );

  -- Live GPS Breadcrumbs
  CREATE TABLE IF NOT EXISTS location_breadcrumbs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id TEXT NOT NULL,
    driver_address TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    speed_kmh REAL DEFAULT 0,
    heading REAL DEFAULT 0,
    recorded_at INTEGER NOT NULL,
    FOREIGN KEY(ride_id) REFERENCES rides(id) ON DELETE CASCADE
  );

  -- Emergency SOS Alerts
  CREATE TABLE IF NOT EXISTS sos_alerts (
    id TEXT PRIMARY KEY,
    ride_id TEXT NOT NULL,
    sender_address TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    lat REAL,
    lng REAL,
    escalation_level TEXT NOT NULL DEFAULT 'URGENT',
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ACKNOWLEDGED, RESOLVED
    delivery_confirmed INTEGER NOT NULL DEFAULT 1,
    details TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(ride_id) REFERENCES rides(id) ON DELETE CASCADE
  );

  -- Blockchain Events Idempotency Log
  CREATE TABLE IF NOT EXISTS blockchain_events_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT NOT NULL,
    event_name TEXT NOT NULL,
    trip_id TEXT NOT NULL,
    block_number INTEGER,
    processed_at INTEGER NOT NULL,
    payload TEXT,
    UNIQUE(tx_hash, event_name, trip_id)
  );

  CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
  CREATE INDEX IF NOT EXISTS idx_rides_passenger ON rides(passenger_address);
  CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_address);
  CREATE INDEX IF NOT EXISTS idx_bids_ride_id ON driver_bids(ride_id, status);
  CREATE INDEX IF NOT EXISTS idx_drivers_online ON drivers(is_online, verification_status);
`);

console.log("[DB] Schema migrations applied successfully.");
