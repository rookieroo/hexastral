/**
 * @zhop/scenario-feng
 *
 * Shared logic for the Fēng (風) feng-shui flagship. Consumed by:
 *   - apps/feng-app
 *   - apps/hexastral-web (/[locale]/feng)
 *
 * Setup pattern (in app root) — same shape as scenario-yuan:
 *
 *   import { createHexastralClient } from '@zhop/hexastral-client'
 *   import { FengClientProvider } from '@zhop/scenario-feng'
 *
 *   const client = createHexastralClient(API_URL, { signRequest })
 *
 *   <FengClientProvider client={client}>
 *     <App />
 *   </FengClientProvider>
 *
 * Compute primitives (24山 / 玄空飞星 / 八宅) live in @zhop/astro-core/feng
 * and are mobile-runnable for the Compass satellite's offline needs.
 *
 * See docs/apps/feng/fix-plan.md and docs/decisions/0003-compass-satellite.md
 * for context.
 */

export * from './components'
export {
  type FengClientConfig,
  FengClientProvider,
  type FengClientProviderProps,
  useFengClient,
} from './context'
export * from './hooks'
export { normalizeFengDeg, nudgeFengDeg, pointToFengDeg } from './lib/facing-deg'
export { metersPerPixel, pixelOffsetToLatLng } from './lib/map-pixel-offset'
export type {
  CreateSiteInput,
  FengPriceQuote,
  FengResidenceType,
  FloorplanImageInput,
  FloorplanInput,
  LogBearingInput,
  PatchSiteInput,
} from './lib/feng-api'
export { fengPriceEstimate, uploadFloorplan } from './lib/feng-api'
export {
  deriveReportDigest,
  patternQualityTone,
  type DigestFocusItem,
  type DigestHeadline,
  type DigestPattern,
  type DigestTone,
  type FormLiVerdict,
  type ReportDigest,
} from './lib/report-digest'
export * from './types'
