/**
 * Open Source Routing Machine (OSRM) Client & Route Geometry Service
 * Reference: https://github.com/Project-OSRM/osrm-backend
 */

// Known transit anchor points with accurate GPS coordinates
export const KNOWN_LOCATIONS = [
  { name: "Makati Financial Central", lat: 14.5547, lng: 121.0244, address: "Ayala Avenue, Makati, Metro Manila" },
  { name: "BGC High Street Hub", lat: 14.5505, lng: 121.0509, address: "5th Avenue, Bonifacio Global City, Taguig" },
  { name: "Ortigas Business District", lat: 14.5869, lng: 121.0614, address: "ADB Avenue, Ortigas Center, Pasig" },
  { name: "NAIA Terminal 3 Expressway", lat: 14.5204, lng: 121.0153, address: "Andrews Avenue, Pasay City" },
  { name: "Quezon City Circle", lat: 14.6517, lng: 121.0494, address: "Elliptical Road, Quezon City" },
  { name: "Alabang Town Center", lat: 14.4253, lng: 121.0315, address: "Alabang-Zapote Road, Muntinlupa" },
  { name: "Mall of Asia Arena Coastal", lat: 14.5318, lng: 120.9818, address: "J.W. Diokno Blvd, Pasay" },
];

/**
 * Calculate Haversine distance in kilometers between two GPS points
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate fallback road-like curved geometry between two coordinates
 */
export function generateFallbackGeometry(lat1, lon1, lat2, lon2, steps = 25) {
  const coordinates = [];
  // Midpoint with slight lateral curve to simulate road turns
  const midLat = (lat1 + lat2) / 2 + (Math.random() - 0.5) * 0.008;
  const midLon = (lon1 + lon2) / 2 + (Math.random() - 0.5) * 0.008;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic bezier curve
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * midLat + t * t * lat2;
    const lon = (1 - t) * (1 - t) * lon1 + 2 * (1 - t) * t * midLon + t * t * lon2;
    coordinates.push([Number(lon.toFixed(6)), Number(lat.toFixed(6))]);
  }
  return coordinates;
}

/**
 * Calculate road route using OSRM with resilient offline fallback
 */
export async function calculateRoadRoute(lat1, lon1, lat2, lon2) {
  // Validate coordinates
  if (
    typeof lat1 !== "number" ||
    typeof lon1 !== "number" ||
    typeof lat2 !== "number" ||
    typeof lon2 !== "number" ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    throw new Error("Invalid coordinate values provided to routing service");
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

  try {
    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Number((route.distance / 1000).toFixed(2));
        const durationMinutes = Math.max(1, Math.round(route.duration / 60));
        const coordinates = route.geometry.coordinates; // Array of [lon, lat]

        return {
          source: "osrm",
          distanceKm,
          durationMinutes,
          geometry: coordinates,
          waypoints: data.waypoints,
          isRoadAccurate: true,
        };
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[OSRM] Public OSRM routing request failed or timed out: ${err.message}. Using deterministic road-model fallback.`);
  }

  // Graceful Fallback
  const straightDistanceKm = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  // Urban road factor: roads are ~1.28x longer than straight lines
  const distanceKm = Number((straightDistanceKm * 1.28).toFixed(2));
  // Average city traffic speed ~ 28 km/h
  const durationMinutes = Math.max(3, Math.round((distanceKm / 28) * 60));
  const fallbackCoords = generateFallbackGeometry(lat1, lon1, lat2, lon2);

  return {
    source: "fallback_interpolation",
    distanceKm: Math.max(1.2, distanceKm),
    durationMinutes,
    geometry: fallbackCoords,
    isRoadAccurate: false,
  };
}

/**
 * Find matching known locations from search query
 */
export function searchLocations(query) {
  if (!query || query.trim().length === 0) {
    return KNOWN_LOCATIONS.slice(0, 5);
  }
  const q = query.toLowerCase().trim();
  const matched = KNOWN_LOCATIONS.filter(
    (loc) => loc.name.toLowerCase().includes(q) || loc.address.toLowerCase().includes(q)
  );
  if (matched.length > 0) return matched;

  // If no match, return default with query as custom destination
  return [
    {
      name: query.trim(),
      lat: 14.55 + (Math.random() - 0.5) * 0.05,
      lng: 121.03 + (Math.random() - 0.5) * 0.05,
      address: `Custom destination: ${query.trim()}`,
    },
    ...KNOWN_LOCATIONS.slice(0, 3),
  ];
}
