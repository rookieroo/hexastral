/**
 * Yuun (auspice) 本月深度 adapter over the shared @zhop/scenario-yuan client.
 *
 * Mirrors Yuel's adapter but with auspice's transport: a PLAIN unsigned POST to the
 * device-scoped `/api/auspice/monthly` (the HMAC gate was dropped for the
 * timeline/makeif routes — anonymous), and an AsyncStorage cache under the
 * `auspice_monthly_depth_` prefix. The birth + derived `user` chart fields + `isPro`
 * the route needs ride the shared client's `extra` blob (passed by the caller).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { resolvePortfolioApiUrl } from '@zhop/satellite-runtime'
import { createMonthlyDepthClient } from '@zhop/scenario-yuan/monthly-depth'

export type {
  MonthlyDepth,
  MonthlyDepthInput,
  MonthlyDepthResult,
} from '@zhop/scenario-yuan/monthly-depth'

const client = createMonthlyDepthClient({
  endpoint: '/api/auspice/monthly',
  cachePrefix: 'auspice_monthly_depth_',
  storage: AsyncStorage,
  async post(path, body) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60_000)
    try {
      return await fetch(`${resolvePortfolioApiUrl()}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
  },
})

export const getCachedMonthlyDepth = client.getCachedMonthlyDepth
export const fetchMonthlyDepth = client.fetchMonthlyDepth
