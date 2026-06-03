import { Hono } from 'hono'
import type { AppEnv } from '../../infra-types'
import { onboardingAppleLinkRoutes } from './apple-link'
import { onboardingBootstrapRoutes } from './bootstrap'
import { onboardingChartRoutes } from './chart'
import { onboardingConvertRoutes } from './convert'
import { onboardingGoogleLinkRoutes } from './google-link'
import { onboardingRevealRoutes } from './reveal'
import { onboardingStaticTraitsRoutes } from './static-traits'

// Note: '/preview' deleted in deep refactor — replaced by '/reveal' (lazy LLM signal,
// persisted as the user's first daily_signals row). See plan Phase 3.6.
// '/static-traits' and '/reveal' are deprecated — use '/bootstrap' (atomic).
export const onboardingRoutes = new Hono<AppEnv>()
  .route('/convert', onboardingConvertRoutes)
  .route('/chart', onboardingChartRoutes)
  .route('/static-traits', onboardingStaticTraitsRoutes)
  .route('/reveal', onboardingRevealRoutes)
  .route('/bootstrap', onboardingBootstrapRoutes)
  .route('/apple-link', onboardingAppleLinkRoutes)
  .route('/google-link', onboardingGoogleLinkRoutes)
