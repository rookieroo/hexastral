/**
 * Internal Key 验证中间件 — service-to-service 认证
 *
 * 用于 svc-fortune / svc-notify 等内部 Worker 通过 service binding 调用的端点。
 * 使用 crypto.subtle 常量时间比较，防止时序攻击。
 *
 * 若 X-Internal-Key 有效，设置 c.set('internalCaller', true) 并跳过后续 HMAC/Turnstile 检查。
 * 若缺失或无效 → 继续到下一个中间件 (HMAC/Turnstile)。
 */

import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../infra-types'

/** Constant-time string comparison via crypto.subtle */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode('internal-key-comparison')
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder.encode(a)),
    crypto.subtle.sign('HMAC', key, encoder.encode(b)),
  ])
  const bufA = new Uint8Array(sigA)
  const bufB = new Uint8Array(sigB)
  if (bufA.length !== bufB.length) return false
  let result = 0
  for (let i = 0; i < bufA.length; i++) {
    result |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0)
  }
  return result === 0
}

export function createInternalKeyMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const internalKey = c.req.header('X-Internal-Key')
    if (!internalKey || !c.env.INTERNAL_KEY) {
      // No internal key provided — fall through to HMAC/Turnstile
      await next()
      return
    }

    const valid = await timingSafeEqual(internalKey, c.env.INTERNAL_KEY)
    if (!valid) {
      // Invalid key — fall through (HMAC will reject due to missing platform header)
      await next()
      return
    }

    // Valid internal caller — set flag so HMAC middleware can skip platform check
    c.set('internalCaller', true)
    await next()
  }
}
