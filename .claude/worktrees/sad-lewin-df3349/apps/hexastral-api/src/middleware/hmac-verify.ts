/**
 * HMAC 签名验证中间件 — iOS / Android 请求防伪
 *
 * 平台路由逻辑 (与 Turnstile 互斥):
 *   - x-client-platform: ios     → 执行 HMAC 签名验证
 *   - x-client-platform: android → 执行 HMAC 签名验证
 *   - x-client-platform: web     → 跳过 (由 Turnstile 中间件处理)
 *   - 缺失或其他值               → 403 拒绝
 *
 * 签名算法 (v2 — x-hmac-version: 2):
 *   1. iOS 端: bodyHash = SHA-256(body)
 *   2. iOS 端: payload = `${userId}.${method}.${path}.${timestamp}.${bodyHash}`
 *   3. iOS 端: signature = HMAC-SHA256(deviceSecret, payload)
 *   4. API 端: 校验 body integrity + timestamp ±60s + constant-time HMAC 比对
 *
 * 向后兼容 (v1 — 无 x-hmac-version header):
 *   payload = `${timestamp}.${bodyHash}` (7 天兼容期后移除)
 *
 * Body integrity: 服务端重算 SHA-256(body) 与 x-body-hash 比对，防止 MITM 篡改。
 */

import { eq } from 'drizzle-orm'
import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { users } from '../db/schema'
import type { AppEnv } from '../infra-types'

const TIMESTAMP_TOLERANCE_SECONDS = 60

/** Compute SHA-256 hex digest of a string */
async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function createHmacVerifyMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    // Internal service-to-service calls (validated by internal-key middleware) bypass HMAC
    if (c.get('internalCaller')) {
      await next()
      return
    }

    const platform = c.req.header('x-client-platform')

    // Reject missing or unknown platform — prevents bypass of both HMAC and Turnstile
    if (platform !== 'ios' && platform !== 'android' && platform !== 'web') {
      throw new HTTPException(403, { message: 'Authentication failed' })
    }

    // Web uses Turnstile — skip HMAC
    if (platform === 'web') {
      await next()
      return
    }

    const timestamp = c.req.header('x-timestamp')
    const bodyHash = c.req.header('x-body-hash')
    const signature = c.req.header('x-signature')

    if (!timestamp || !bodyHash || !signature) {
      throw new HTTPException(403, { message: 'Authentication failed' })
    }

    // Validate timestamp within ±60 seconds (anti-replay)
    const now = Math.floor(Date.now() / 1000)
    const reqTime = Number(timestamp)
    if (Number.isNaN(reqTime) || Math.abs(now - reqTime) > TIMESTAMP_TOLERANCE_SECONDS) {
      throw new HTTPException(403, { message: 'Authentication failed' })
    }

    // Extract userId from Authorization header to look up deviceSecret
    const authHeader = c.req.header('Authorization')
    const userId = authHeader?.replace('Bearer ', '')
    if (!userId) {
      throw new HTTPException(401, { message: 'Missing authorization' })
    }

    // ── Body integrity verification ──
    // Re-hash the actual request body and compare against the client-provided hash.
    // This prevents MITM body tampering where an attacker modifies the body
    // but keeps the original (valid) signature headers.
    // Note: Hono caches the body after first read, so c.req.json() in route handlers still works.
    const rawBody = c.req.method === 'GET' || c.req.method === 'HEAD' ? '' : await c.req.text()
    const actualBodyHash = await sha256Hex(rawBody)
    if (actualBodyHash !== bodyHash) {
      throw new HTTPException(403, { message: 'Authentication failed' })
    }

    const db = c.get('db')
    const user = await db
      .select({ deviceSecret: users.deviceSecret })
      .from(users)
      .where(eq(users.id, userId))
      .get()

    if (!user?.deviceSecret) {
      throw new HTTPException(403, { message: 'Authentication failed' })
    }

    // ── Construct HMAC payload ──
    // v2 (x-hmac-version: 2): userId.METHOD./path.timestamp.bodyHash
    // v1 (legacy, compat period): timestamp.bodyHash
    const hmacVersion = c.req.header('x-hmac-version')
    let payload: string
    if (hmacVersion === '2') {
      const method = c.req.method.toUpperCase()
      const path = new URL(c.req.url).pathname
      payload = `${userId}.${method}.${path}.${timestamp}.${bodyHash}`
    } else {
      // Legacy v1 — remove after 7-day compat window
      payload = `${timestamp}.${bodyHash}`
    }

    // Constant-time HMAC verification via crypto.subtle.verify
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(user.deviceSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Convert hex signature to bytes for constant-time verify
    const sigBytes = new Uint8Array(
      (signature.match(/.{2}/g) ?? []).map((h) => Number.parseInt(h, 16))
    )
    if (sigBytes.length !== 32) {
      throw new HTTPException(403, { message: 'Authentication failed' })
    }

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload))
    if (!isValid) {
      throw new HTTPException(403, { message: 'Authentication failed' })
    }

    // Inject authenticated userId into request context
    c.set('userId', userId)
    await next()
  }
}
