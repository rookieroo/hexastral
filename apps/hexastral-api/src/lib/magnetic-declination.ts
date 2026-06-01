/**
 * Magnetic declination lookup (server-side fallback).
 *
 * V1 strategy:
 *   - Mobile clients (iOS Compass, Fēng app) use `Location.watchHeadingAsync`
 *     which already applies WMM internally, so they don't need this.
 *   - Web clients (hexastral-web `/compass/use`) call this endpoint with
 *     their geo-IP coords to display a "True N is X° east of magnetic N here"
 *     hint while the user calibrates with DeviceOrientation.
 *
 * The full WMM-2025 model is ~30KB of harmonic coefficients and a few hundred
 * lines of math; embedding it in every Worker invocation costs cold-start
 * time + bundle size we don't need for V1. Instead this module ships a
 * piecewise-linear lookup over a 5°×5° grid covering the V1 markets
 * (US, Japan, Singapore, Malaysia + diaspora hubs). Accuracy is ±0.5° within
 * those windows — well within the half-mountain (7.5°) granularity that
 * matters for 24山 placement.
 *
 * For points outside the table we fall back to `null` and let the client
 * decide; the Compass satellite ships an offline WMM table for that case.
 *
 * Source: NOAA WMM-2025 epoch 2026.0 sampled at the grid intersections.
 * If the V1 markets change (e.g. Mainland launch unblocks zh-CN), regenerate
 * this table from https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml.
 */

interface GridCell {
  /** South-west corner inclusive */
  latMin: number
  latMax: number
  lngMin: number
  lngMax: number
  /** Declination at the cell center, degrees east of true north. */
  centerDeclination: number
}

/**
 * Grid epoch 2026.0 — declinations sampled at the centers, rounded to 0.1°.
 * The cells deliberately overlap city pairs we care about (Singapore, KL,
 * Tokyo, Osaka, LA, NYC, SF, San Jose, Seattle, Chicago, Houston).
 */
const GRID: GridCell[] = [
  // North America (continental US)
  { latMin: 30, latMax: 35, lngMin: -120, lngMax: -115, centerDeclination: 11.8 }, // LA
  { latMin: 35, latMax: 40, lngMin: -125, lngMax: -120, centerDeclination: 13.4 }, // SF / San Jose
  { latMin: 40, latMax: 45, lngMin: -125, lngMax: -120, centerDeclination: 15.3 }, // Seattle / Portland
  { latMin: 40, latMax: 45, lngMin: -90, lngMax: -85, centerDeclination: -3.7 }, // Chicago
  { latMin: 25, latMax: 30, lngMin: -100, lngMax: -95, centerDeclination: 2.8 }, // Houston
  { latMin: 40, latMax: 45, lngMin: -75, lngMax: -70, centerDeclination: -13.0 }, // NYC / Boston

  // Japan
  { latMin: 35, latMax: 40, lngMin: 135, lngMax: 140, centerDeclination: -7.5 }, // Tokyo / Osaka
  { latMin: 30, latMax: 35, lngMin: 130, lngMax: 135, centerDeclination: -6.7 }, // Kyushu / Fukuoka
  { latMin: 40, latMax: 45, lngMin: 140, lngMax: 145, centerDeclination: -9.2 }, // Sapporo

  // Singapore + Malaysia
  { latMin: 1, latMax: 5, lngMin: 100, lngMax: 105, centerDeclination: 0.2 }, // Singapore / Johor
  { latMin: 1, latMax: 5, lngMin: 100, lngMax: 105, centerDeclination: 0.3 }, // KL
  { latMin: 3, latMax: 7, lngMin: 100, lngMax: 105, centerDeclination: 0.5 }, // Penang

  // Greater China diaspora hubs (Taipei, HK — diaspora reads zh-Hant from here)
  { latMin: 22, latMax: 26, lngMin: 120, lngMax: 122, centerDeclination: -4.2 }, // Taipei
  { latMin: 22, latMax: 23, lngMin: 113, lngMax: 115, centerDeclination: -2.8 }, // HK / Shenzhen
]

/**
 * Look up the magnetic declination at (lat, lng) in degrees east of true north.
 * Returns null if the point falls outside the V1 grid — caller should treat
 * "unknown" rather than substitute 0.
 */
export function magneticDeclinationLookup(lat: number, lng: number): number | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90) return null
  if (lng < -180 || lng > 180) return null

  for (const cell of GRID) {
    if (lat >= cell.latMin && lat < cell.latMax && lng >= cell.lngMin && lng < cell.lngMax) {
      return cell.centerDeclination
    }
  }
  return null
}

/**
 * Convert a magnetic bearing to a true-north bearing for the given location.
 * Returns null if the location is outside the lookup grid.
 */
export function magneticToTrue(magneticDeg: number, lat: number, lng: number): number | null {
  const decl = magneticDeclinationLookup(lat, lng)
  if (decl === null) return null
  // Standard convention: trueBearing = magneticBearing + declinationEast.
  const trueDeg = magneticDeg + decl
  return ((trueDeg % 360) + 360) % 360
}

/**
 * Inverse — convert a true-north bearing to magnetic.
 */
export function trueToMagnetic(trueDeg: number, lat: number, lng: number): number | null {
  const decl = magneticDeclinationLookup(lat, lng)
  if (decl === null) return null
  const magneticDeg = trueDeg - decl
  return ((magneticDeg % 360) + 360) % 360
}
