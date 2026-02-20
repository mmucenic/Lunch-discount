// Reference point: Deutsche Bank, 10 Upper Bank St, Canary Wharf Estate, London E14 5GW
export const DB_LAT = 51.5046
export const DB_LNG = -0.0188

// Generic fallback when a deal has no specific coordinates
export const CW_CENTER_LAT = 51.5051
export const CW_CENTER_LNG = -0.0201

/** Great-circle distance in metres (Haversine formula). */
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Returns a human-readable distance string and walking minutes from Deutsche Bank.
 * Applies a 1.3× street-routing factor over the straight-line distance.
 */
export function walkFromDB(lat: number, lng: number): { distance: string; walkMins: number } {
  const straight = haversineMetres(DB_LAT, DB_LNG, lat, lng)
  const walkMetres = straight * 1.3
  const walkMins = Math.max(1, Math.round(walkMetres / 80)) // ~80 m/min
  const distance =
    straight < 1000
      ? `${Math.round(straight / 10) * 10}m`
      : `${(straight / 1000).toFixed(1)}km`
  return { distance, walkMins }
}
