/**
 * Golden feng sites — fixed coordinates + expected prefetch / quality labels for regression.
 */

export interface FengGoldenSite {
  id: string
  label: string
  lat: number
  lng: number
  facingDegTrue: number
  residenceType: 'apartment' | 'flat' | 'villa'
  buildYearAccuracy: 'exact' | 'decade' | 'moveIn' | 'unknown'
  buildYear?: number
  /** Expected prefetch traits (when Mapbox available in integration). */
  expect: {
    flatUrban?: boolean
    hasWater?: boolean
    hasMountain?: boolean
  }
  /** Minimum inputScore when birth + floorplan omitted. */
  minInputScore: number
}

export const FENG_GOLDEN_SITES: readonly FengGoldenSite[] = [
  {
    id: 'sg-marina-apartment',
    label: 'Singapore Marina Bay apartment',
    lat: 1.2834,
    lng: 103.8607,
    facingDegTrue: 135,
    residenceType: 'apartment',
    buildYearAccuracy: 'exact',
    buildYear: 2012,
    expect: { flatUrban: true },
    minInputScore: 55,
  },
  {
    id: 'hk-central-flat',
    label: 'Hong Kong Central flat',
    lat: 22.2819,
    lng: 114.158,
    facingDegTrue: 90,
    residenceType: 'flat',
    buildYearAccuracy: 'decade',
    buildYear: 1995,
    expect: { flatUrban: true },
    minInputScore: 48,
  },
  {
    id: 'la-hills-villa',
    label: 'Los Angeles hills villa',
    lat: 34.1184,
    lng: -118.3004,
    facingDegTrue: 180,
    residenceType: 'villa',
    buildYearAccuracy: 'exact',
    buildYear: 1988,
    expect: { hasMountain: true },
    minInputScore: 55,
  },
  {
    id: 'tokyo-riverside',
    label: 'Tokyo riverside apartment',
    lat: 35.6762,
    lng: 139.7649,
    facingDegTrue: 45,
    residenceType: 'apartment',
    buildYearAccuracy: 'moveIn',
    expect: { hasWater: true },
    minInputScore: 42,
  },
  {
    id: 'shanghai-pudong',
    label: 'Shanghai Pudong tower',
    lat: 31.2397,
    lng: 121.4998,
    facingDegTrue: 0,
    residenceType: 'flat',
    buildYearAccuracy: 'exact',
    buildYear: 2018,
    expect: { flatUrban: true },
    minInputScore: 60,
  },
  {
    id: 'london-suburb',
    label: 'London suburb semi',
    lat: 51.5074,
    lng: -0.1278,
    facingDegTrue: 270,
    residenceType: 'villa',
    buildYearAccuracy: 'decade',
    buildYear: 2000,
    expect: { flatUrban: true },
    minInputScore: 48,
  },
  {
    id: 'sydney-harbour',
    label: 'Sydney harbour apartment',
    lat: -33.8568,
    lng: 151.2153,
    facingDegTrue: 315,
    residenceType: 'apartment',
    buildYearAccuracy: 'exact',
    buildYear: 2005,
    expect: { hasWater: true },
    minInputScore: 55,
  },
  {
    id: 'beijing-hutong',
    label: 'Beijing hutong courtyard',
    lat: 39.9289,
    lng: 116.3883,
    facingDegTrue: 180,
    residenceType: 'villa',
    buildYearAccuracy: 'unknown',
    expect: { flatUrban: true },
    minInputScore: 30,
  },
  {
    id: 'nyc-midtown',
    label: 'NYC Midtown flat',
    lat: 40.7549,
    lng: -73.984,
    facingDegTrue: 225,
    residenceType: 'flat',
    buildYearAccuracy: 'exact',
    buildYear: 1965,
    expect: { flatUrban: true },
    minInputScore: 60,
  },
  {
    id: 'vancouver-view',
    label: 'Vancouver mountain view',
    lat: 49.2827,
    lng: -123.1207,
    facingDegTrue: 45,
    residenceType: 'apartment',
    buildYearAccuracy: 'decade',
    buildYear: 2010,
    expect: { hasMountain: true },
    minInputScore: 48,
  },
] as const
