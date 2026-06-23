/**
 * 流年深读 (monthly LLM depth) — kindred adapter over the shared @zhop/scenario-yuan
 * contract + client. The contract, request shape, response normalization, and cache
 * logic live in the package (so Yuel and Yuun can't drift); this file only injects
 * kindred's transport: HMAC-v2 signing, the API base URL, the `yuan_user_id` identity,
 * AsyncStorage, and the stable `kindred_monthly_depth_` cache prefix.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createMonthlyDepthClient } from '@zhop/scenario-yuan/monthly-depth'
import { config } from '../config'
import { signRequest } from '../hmac'

export type {
  MonthlyDepth,
  MonthlyDepthInput,
  MonthlyDepthResult,
} from '@zhop/scenario-yuan/monthly-depth'

const client = createMonthlyDepthClient({
  cachePrefix: 'kindred_monthly_depth_',
  storage: AsyncStorage,
  async post(path, body) {
    let userId: string | null = null
    try {
      userId = await AsyncStorage.getItem('yuan_user_id')
    } catch {
      userId = null
    }
    if (!userId) return null

    const signed = await signRequest({ body, userId, method: 'POST', path })
    if (!signed) return null

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60_000)
    try {
      return await fetch(`${config.apiUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
          ...signed,
        },
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
