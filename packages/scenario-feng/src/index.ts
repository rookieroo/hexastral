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
 * See docs/feng-plan.md and docs/decisions/0003-compass-satellite.md
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
export type { CreateSiteInput, LogBearingInput, PatchSiteInput } from './lib/feng-api'
export { nudgeFengDeg, normalizeFengDeg, pointToFengDeg } from './lib/facing-deg'
export * from './types'
