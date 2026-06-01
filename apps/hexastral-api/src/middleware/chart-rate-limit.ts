/**
 * Chart 端点分级速率限制
 *
 * 针对高成本的 LLM 端点（natal/stellar/shuangpan/hehun/fate-report），
 * 按用户层级实施更严格的独立速率限制。
 *
 * 策略:
 *   - L1: Cloudflare CHART_RATE_LIMITER (原子性，5 req/min) — 防突发
 *   - L2: KV daily counter (best-effort, eventual consistency):
 *     - 匿名 Web 用户: 基于 IP, 3 次/天
 *     - Free 用户: 基于 userId, 10 次/天
 *     - Pro/Premium 用户: 无每日限制
 *
 * KV 计数器可能在高并发下略有偏差 (±1)，但 L1 原子限制器保证不会被大幅绕过。
 */

import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from '../infra-types'
import { userHasAnySubscription } from '../lib/access/entitlement-access'

// Pre-PMF testing headroom. Production thresholds were 3 / 10; retune once
// real abuse signal exists (or move to env-driven config).
const ANON_DAILY_LIMIT = 20
const FREE_DAILY_LIMIT = 100

export function createChartRateLimitMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
    // Use authenticated userId from HMAC middleware (runs after auth verification)
    const userId = c.get('userId') as string | undefined

    const today = new Date().toISOString().split('T')[0]

    // ── L1: Cloudflare native rate limiter (atomic, burst protection) ──
    const { success } = await c.env.CHART_RATE_LIMITER.limit({ key: userId ?? `ip:${ip}` })
    if (!success) {
      throw new HTTPException(429, { message: 'Chart rate limit exceeded' })
    }

    // ── L2: Daily limit via KV counter (best-effort, ±1 tolerance) ──
    if (!userId) {
      const counterKey = `chart:daily:ip:${ip}:${today}`
      const count = Number(await c.env.GUARD_KV.get(counterKey)) || 0

      if (count >= ANON_DAILY_LIMIT) {
        throw new HTTPException(429, { message: 'Daily limit reached' })
      }

      // Synchronous write — reduces race window (KV still eventually consistent)
      await c.env.GUARD_KV.put(counterKey, String(count + 1), { expirationTtl: 86400 })
    } else {
      const db = c.get('db')
      const isPro = await userHasAnySubscription(db, userId)

      if (!isPro) {
        const counterKey = `chart:daily:user:${userId}:${today}`
        const count = Number(await c.env.GUARD_KV.get(counterKey)) || 0

        if (count >= FREE_DAILY_LIMIT) {
          throw new HTTPException(429, { message: 'Daily limit reached' })
        }

        await c.env.GUARD_KV.put(counterKey, String(count + 1), { expirationTtl: 86400 })
      }
    }

    await next()
  }
}
