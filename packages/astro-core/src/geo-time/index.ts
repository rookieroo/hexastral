/**
 * @zhop/astro-core — Geo-Time Engine barrel exports
 *
 * 全球真太阳时 + 南半球月令置换
 */

export type { HemisphereAdjustmentResult } from './hemisphere'
export {
  applySouthernHemisphereAdjustment,
  getSouthernMonthBranch,
  isSouthernHemisphere,
} from './hemisphere'
export type { CityGeoInfo, GlobalSolarTimeResult } from './solar-time'
export {
  calcGlobalTrueSolarTime,
  GLOBAL_CITIES,
  getTimezoneOffset,
  searchCity,
} from './solar-time'
