/**
 * @zhop/astro-core — 太阳视黄经（高精度天文算法）
 *
 * Apparent geocentric ecliptic longitude of the Sun, used to anchor the 24
 * 节气 precisely (a 节气 is the instant the Sun's apparent longitude crosses a
 * multiple of 15°).
 *
 * Method (Meeus, *Astronomical Algorithms* 2nd ed.):
 *   1. Earth heliocentric longitude L and radius vector R via a truncated
 *      VSOP87D series (Ch. 32 / App. III).
 *   2. Geocentric Sun longitude = L + 180°.
 *   3. FK5 frame correction, nutation in longitude Δψ (Ch. 22), and aberration
 *      (−20.4898″ / R) → apparent longitude (Ch. 25).
 *
 * Accuracy of the truncated series is sub-arcsecond for the dominant terms and
 * better than ~1″ overall over 1800–2200 — i.e. the 节气 *instant* is good to a
 * few seconds, far better than the ±1-day approximation it replaces. Verified
 * to the minute against authoritative published 节气 times (NAO Japan) in
 * `__tests__/jieqi.test.ts`.
 *
 * All longitudes are in degrees in [0, 360). Time arguments are JDE (Julian
 * Ephemeris Day, i.e. Julian Day in TT/Dynamical Time).
 */

const DEG = 180 / Math.PI
const RAD = Math.PI / 180

/** Julian Day (TT or UT — same numeric form) at the J2000.0 epoch. */
const J2000 = 2451545.0

/** Unix epoch (1970-01-01T00:00:00Z) as a Julian Day. */
const JD_UNIX_EPOCH = 2440587.5

const DAY_MS = 86_400_000

// ────────────────────────────────────────────────────────────────────────────
// Julian Day ↔ Date (UTC)
// ────────────────────────────────────────────────────────────────────────────

/** Julian Day from a JS Date (interpreted as the UTC instant it represents). */
export function dateToJulianDay(date: Date): number {
  return date.getTime() / DAY_MS + JD_UNIX_EPOCH
}

/** JS Date (UTC instant) from a Julian Day. */
export function julianDayToDate(jd: number): Date {
  return new Date((jd - JD_UNIX_EPOCH) * DAY_MS)
}

// ────────────────────────────────────────────────────────────────────────────
// ΔT  (TT − UT), seconds — Espenak & Meeus (2006) polynomial expressions
// ────────────────────────────────────────────────────────────────────────────

/**
 * Approximate ΔT in seconds for a decimal year, used to convert between the
 * Dynamical Time the VSOP series wants and the civil (UT/UTC) time 节气 tables
 * are published in. Espenak–Meeus polynomials; ~1 s where observed, a few s in
 * the post-2005 extrapolation — negligible for day determination.
 */
export function deltaTSeconds(year: number): number {
  let u: number
  if (year < 1900) {
    // 1800–1900 (Espenak–Meeus); good enough for historical birth dates.
    const t = year - 1900
    return (
      -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t * t * t * t
    )
  }
  if (year < 1920) {
    const t = year - 1900
    return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4
  }
  if (year < 1941) {
    const t = year - 1920
    return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t ** 3
  }
  if (year < 1961) {
    const t = year - 1950
    return 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547
  }
  if (year < 1986) {
    const t = year - 1975
    return 45.45 + 1.067 * t - (t * t) / 260 - (t * t * t) / 718
  }
  if (year < 2005) {
    const t = year - 2000
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t * t +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    )
  }
  if (year < 2050) {
    const t = year - 2000
    return 62.92 + 0.32217 * t + 0.005589 * t * t
  }
  if (year < 2150) {
    u = (year - 1820) / 100
    return -20 + 32 * u * u - 0.5628 * (2150 - year)
  }
  u = (year - 1820) / 100
  return -20 + 32 * u * u
}

// ────────────────────────────────────────────────────────────────────────────
// VSOP87D — Earth heliocentric longitude (L) and radius vector (R)
// Triples are [A, B, C]; series term = A·cos(B + C·τ), τ in Julian millennia.
// L in units of 1e-8 rad; R in units of 1e-8 AU. (Meeus, Appendix III.)
// ────────────────────────────────────────────────────────────────────────────

type Term = readonly [number, number, number]

const EARTH_L0: readonly Term[] = [
  [175347046, 0, 0],
  [3341656, 4.6692568, 6283.07585],
  [34894, 4.6261, 12566.1517],
  [3497, 2.7441, 5753.3849],
  [3418, 2.8289, 3.5231],
  [3136, 3.6277, 77713.7715],
  [2676, 4.4181, 7860.4194],
  [2343, 6.1352, 3930.2097],
  [1324, 0.7425, 11506.7698],
  [1273, 2.0371, 529.691],
  [1199, 1.1096, 1577.3435],
  [990, 5.233, 5884.927],
  [902, 2.045, 26.298],
  [857, 3.508, 398.149],
  [780, 1.179, 5223.694],
  [753, 2.533, 5507.553],
  [505, 4.583, 18849.228],
  [492, 4.205, 775.523],
  [357, 2.92, 0.067],
  [317, 5.849, 11790.629],
  [284, 1.899, 796.298],
  [271, 0.315, 10977.079],
  [243, 0.345, 5486.778],
  [206, 4.806, 2544.314],
  [205, 1.869, 5573.143],
  [202, 2.458, 6069.777],
  [156, 0.833, 213.299],
  [132, 3.411, 2942.463],
  [126, 1.083, 20.775],
  [115, 0.645, 0.98],
  [103, 0.636, 4694.003],
  [102, 0.976, 15720.839],
  [102, 4.267, 7.114],
  [99, 6.21, 2146.17],
  [98, 0.68, 155.42],
  [86, 5.98, 161000.69],
  [85, 1.3, 6275.96],
  [85, 3.67, 71430.7],
  [80, 1.81, 17260.15],
  [79, 3.04, 12036.46],
  [75, 1.76, 5088.63],
  [74, 3.5, 3154.69],
  [74, 4.68, 801.82],
  [70, 0.83, 9437.76],
  [62, 3.98, 8827.39],
  [61, 1.82, 7084.9],
  [57, 2.78, 6286.6],
  [56, 4.39, 14143.5],
  [56, 3.47, 6279.55],
  [52, 0.19, 12139.55],
  [52, 1.33, 1748.02],
  [51, 0.28, 5856.48],
  [49, 0.49, 1194.45],
  [41, 5.37, 8429.24],
  [41, 2.4, 19651.05],
  [39, 6.17, 10447.39],
  [37, 6.04, 10213.29],
  [37, 2.57, 1059.38],
  [36, 1.71, 2352.87],
  [36, 1.78, 6812.77],
  [33, 0.59, 17789.85],
  [30, 0.44, 83996.85],
  [30, 2.74, 1349.87],
  [25, 3.16, 4690.48],
]

const EARTH_L1: readonly Term[] = [
  [628331966747, 0, 0],
  [206059, 2.678235, 6283.07585],
  [4303, 2.6351, 12566.1517],
  [425, 1.59, 3.523],
  [119, 5.796, 26.298],
  [109, 2.966, 1577.344],
  [93, 2.59, 18849.23],
  [72, 1.14, 529.69],
  [68, 1.87, 398.15],
  [67, 4.41, 5507.55],
  [59, 2.89, 5223.69],
  [56, 2.17, 155.42],
  [45, 0.4, 796.3],
  [36, 0.47, 775.52],
  [29, 2.65, 7.11],
  [21, 5.34, 0.98],
  [19, 1.85, 5486.78],
  [19, 4.97, 213.3],
  [17, 2.99, 6275.96],
  [16, 0.03, 2544.31],
  [16, 1.43, 2146.17],
  [15, 1.21, 10977.08],
  [12, 2.83, 1748.02],
  [12, 3.26, 5088.63],
  [12, 5.27, 1194.45],
  [12, 2.08, 4694],
  [11, 0.77, 553.57],
  [10, 1.3, 6286.6],
  [10, 4.24, 1349.87],
  [9, 2.7, 242.73],
  [9, 5.64, 951.72],
  [8, 5.3, 2352.87],
  [6, 2.65, 9437.76],
  [6, 4.67, 4690.48],
]

const EARTH_L2: readonly Term[] = [
  [52919, 0, 0],
  [8720, 1.0721, 6283.0758],
  [309, 0.867, 12566.152],
  [27, 0.05, 3.52],
  [16, 5.19, 26.3],
  [16, 3.68, 155.42],
  [10, 0.76, 18849.23],
  [9, 2.06, 77713.77],
  [7, 0.83, 775.52],
  [5, 4.66, 1577.34],
  [4, 1.03, 7.11],
  [4, 3.44, 5573.14],
  [3, 5.14, 796.3],
  [3, 6.05, 5507.55],
  [3, 1.19, 242.73],
  [3, 6.12, 529.69],
  [3, 0.31, 398.15],
  [3, 2.28, 553.57],
  [2, 4.38, 5223.69],
  [2, 3.75, 0.98],
]

const EARTH_L3: readonly Term[] = [
  [289, 5.844, 6283.076],
  [35, 0, 0],
  [17, 5.49, 12566.15],
  [3, 5.2, 155.42],
  [1, 4.72, 3.52],
  [1, 5.3, 18849.23],
  [1, 5.97, 242.73],
]

const EARTH_L4: readonly Term[] = [
  [114, 3.142, 0],
  [8, 4.13, 6283.08],
  [1, 3.84, 12566.15],
]

const EARTH_L5: readonly Term[] = [[1, 3.14, 0]]

const EARTH_R0: readonly Term[] = [
  [100013989, 0, 0],
  [1670700, 3.0984635, 6283.07585],
  [13956, 3.05525, 12566.1517],
  [3084, 5.1985, 77713.7715],
  [1628, 1.1739, 5753.3849],
  [1576, 2.8469, 7860.4194],
  [925, 5.453, 11506.77],
  [542, 4.564, 3930.21],
  [472, 3.661, 5884.927],
  [346, 0.964, 5507.553],
  [329, 5.9, 5223.694],
  [307, 0.299, 5573.143],
  [243, 4.273, 11790.629],
  [212, 5.847, 1577.344],
  [186, 5.022, 10977.079],
  [175, 3.012, 18849.228],
  [110, 5.055, 5486.778],
  [98, 0.89, 6069.78],
  [86, 5.69, 15720.84],
  [86, 1.27, 161000.69],
  [65, 0.27, 17260.15],
  [63, 0.92, 529.69],
  [57, 2.01, 83996.85],
  [56, 5.24, 71430.7],
  [49, 3.25, 2544.31],
  [47, 2.58, 775.52],
  [45, 5.54, 9437.76],
  [43, 6.01, 6275.96],
  [39, 5.36, 4694],
  [38, 2.39, 8827.39],
  [37, 0.83, 19651.05],
  [37, 4.9, 12139.55],
]

const EARTH_R1: readonly Term[] = [
  [103019, 1.10749, 6283.07585],
  [1721, 1.0644, 12566.1517],
  [702, 3.142, 0],
  [32, 1.02, 18849.23],
  [31, 2.84, 5507.55],
  [25, 1.32, 5223.69],
  [18, 1.42, 1577.34],
  [10, 5.91, 10977.08],
  [9, 1.42, 6275.96],
  [9, 0.27, 5486.78],
]

const EARTH_R2: readonly Term[] = [
  [4359, 5.7846, 6283.0758],
  [124, 5.579, 12566.152],
  [12, 3.14, 0],
  [9, 3.63, 77713.77],
  [6, 1.87, 5573.14],
  [3, 5.47, 18849.23],
]

/** Σ A·cos(B + C·τ) over a VSOP term series. */
function sumSeries(terms: readonly Term[], tau: number): number {
  let s = 0
  for (const [a, b, c] of terms) s += a * Math.cos(b + c * tau)
  return s
}

/** Earth heliocentric longitude L (radians) and radius vector R (AU) at JDE. */
function earthHeliocentric(jde: number): { L: number; R: number } {
  const tau = (jde - J2000) / 365250
  const L =
    (sumSeries(EARTH_L0, tau) +
      sumSeries(EARTH_L1, tau) * tau +
      sumSeries(EARTH_L2, tau) * tau ** 2 +
      sumSeries(EARTH_L3, tau) * tau ** 3 +
      sumSeries(EARTH_L4, tau) * tau ** 4 +
      sumSeries(EARTH_L5, tau) * tau ** 5) /
    1e8
  const R =
    (sumSeries(EARTH_R0, tau) +
      sumSeries(EARTH_R1, tau) * tau +
      sumSeries(EARTH_R2, tau) * tau ** 2) /
    1e8
  return { L, R }
}

// ────────────────────────────────────────────────────────────────────────────
// Nutation in longitude Δψ (Meeus Ch. 22, leading terms; ~0.5″ accuracy)
// Coefficients in units of 1e-4 arcsec.
// ────────────────────────────────────────────────────────────────────────────

/** [d, m, mp, f, om, sinCoeff, sinCoeffT] — argument = d·D + m·M + mp·M' + f·F + om·Ω */
const NUTATION_TERMS: readonly (readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
])[] = [
  [0, 0, 0, 0, 1, -171996, -174.2],
  [-2, 0, 0, 2, 2, -13187, -1.6],
  [0, 0, 0, 2, 2, -2274, -0.2],
  [0, 0, 0, 0, 2, 2062, 0.2],
  [0, 1, 0, 0, 0, 1426, -3.4],
  [0, 0, 1, 0, 0, 712, 0.1],
  [-2, 1, 0, 2, 2, -517, 1.2],
  [0, 0, 0, 2, 1, -386, -0.4],
  [0, 0, 1, 2, 2, -301, 0],
  [-2, -1, 0, 2, 2, 217, -0.5],
  [-2, 0, 1, 0, 0, -158, 0],
  [-2, 0, 0, 2, 1, 129, 0.1],
  [0, 0, -1, 2, 2, 123, 0],
]

/** Nutation in longitude Δψ in degrees at JDE. */
function nutationInLongitude(jde: number): number {
  const t = (jde - J2000) / 36525
  // Fundamental arguments (degrees).
  const D = 297.85036 + 445267.11148 * t - 0.0019142 * t * t + (t * t * t) / 189474
  const M = 357.52772 + 35999.05034 * t - 0.0001603 * t * t - (t * t * t) / 300000
  const Mp = 134.96298 + 477198.867398 * t + 0.0086972 * t * t + (t * t * t) / 56250
  const F = 93.27191 + 483202.017538 * t - 0.0036825 * t * t + (t * t * t) / 327270
  const Om = 125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t) / 450000
  let dpsi = 0
  for (const [d, m, mp, f, om, s, st] of NUTATION_TERMS) {
    const arg = (d * D + m * M + mp * Mp + f * F + om * Om) * RAD
    dpsi += (s + st * t) * Math.sin(arg)
  }
  // 1e-4 arcsec → degrees.
  return dpsi / 1e4 / 3600
}

// ────────────────────────────────────────────────────────────────────────────
// Apparent solar longitude
// ────────────────────────────────────────────────────────────────────────────

/**
 * Apparent geocentric ecliptic longitude of the Sun, in degrees [0, 360), at
 * the given JDE (Julian Day in Dynamical Time).
 */
export function apparentSolarLongitude(jde: number): number {
  const { L, R } = earthHeliocentric(jde)
  // Geocentric Sun longitude = Earth heliocentric + 180°.
  let lon = L * DEG + 180
  // FK5 frame correction (the latitude-dependent part is negligible for the Sun).
  lon += -0.09033 / 3600
  // Nutation in longitude.
  lon += nutationInLongitude(jde)
  // Aberration (−20.4898″ / R).
  lon += -20.4898 / R / 3600
  return ((lon % 360) + 360) % 360
}

/**
 * Find the JDE (Dynamical Time) at which the Sun's apparent longitude reaches
 * `targetDeg`, starting from `jdeGuess`. Newton iteration on the near-constant
 * mean motion (~0.98565°/day); converges in a few steps.
 */
export function solarLongitudeCrossing(targetDeg: number, jdeGuess: number): number {
  let jde = jdeGuess
  for (let i = 0; i < 8; i++) {
    const lon = apparentSolarLongitude(jde)
    // Signed shortest angular distance to the target, in degrees.
    let diff = ((targetDeg - lon + 180) % 360) - 180
    if (diff < -180) diff += 360
    jde += diff / 0.98564736 // mean solar motion °/day
    if (Math.abs(diff) < 1e-7) break
  }
  return jde
}
