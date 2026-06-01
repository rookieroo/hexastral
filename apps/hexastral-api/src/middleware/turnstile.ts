/**
 * Turnstile 验证中间件
 *
 * 平台路由逻辑 (与 HMAC 互斥):
 *   - x-client-platform: web     → 执行 Turnstile token 校验
 *   - x-client-platform: ios     → 跳过 (由 HMAC 中间件处理)
 *   - x-client-platform: android → 跳过 (由 HMAC 中间件处理)
 *   - 缺失或其他值               → 403 拒绝 (由 HMAC 中间件拦截)
 *
 * 校验流程:
 *   1. 读取 x-turnstile-token Header
 *   2. POST challenges.cloudflare.com/turnstile/v0/siteverify 验证
 *   3. 失败 → 403 Forbidden
 */

import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from '../infra-types'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
}

export function createTurnstileMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const platform = c.req.header('x-client-platform')

    // iOS uses HMAC signing — skip Turnstile (HMAC middleware handles ios + rejects unknown)
    if (platform !== 'web') {
      await next()
      return
    }

    const token = c.req.header('x-turnstile-token')
    if (!token) {
      throw new HTTPException(403, { message: 'Missing Turnstile token' })
    }

    let secret = c.env.TURNSTILE_SECRET
    if (!secret) {
      if (c.env.ENVIRONMENT === 'production') {
        throw new HTTPException(500, { message: 'Turnstile configuration error' })
      }
      // Use Cloudflare's always-pass test key in dev — never skip verification entirely
      // https://developers.cloudflare.com/turnstile/troubleshooting/testing/
      secret = '1x0000000000000000000000000000AA'
      console.warn(
        '[turnstile] Using test secret in dev — configure TURNSTILE_SECRET for production'
      )
    }

    const ip = c.req.header('CF-Connecting-IP') ?? ''

    const formData = new FormData()
    formData.append('secret', secret)
    formData.append('response', token)
    if (ip) {
      formData.append('remoteip', ip)
    }

    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body: formData,
    })

    const result = (await res.json()) as TurnstileVerifyResponse

    if (!result.success) {
      const msgs = result['error-codes']?.join(', ') || 'Unknown error'
      console.warn('[turnstile] Verification failed:', msgs)
      throw new HTTPException(403, { message: `Turnstile verification failed: ${msgs}` })
    }

    await next()
  }
}
