/**
 * HexAstral API 基础设施类型
 *
 * 包含 Cloudflare Workers 特定类型（D1, KV, R2, AI, Fetcher 等），
 * 以及 Hono 框架的 AppEnv 类型。
 * 这些类型仅供 API Worker 内部使用，不向客户端（hexastral-client）暴露。
 */

import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type * as schema from './db/schema'

/** Schema-aware Drizzle D1 database instance — use this type in all helpers and routes */
export type AppDb = DrizzleD1Database<typeof schema>

// ==================== Cloudflare Bindings ====================

export interface CloudflareBindings {
  DB: D1Database
  AI: Ai
  GUARD_KV: KVNamespace
  DDL_KV: KVNamespace
  RATE_LIMITER: RateLimit
  /** Service binding → hexastral-svc-geocode (no public URL) */
  SVC_GEOCODE: Fetcher
  /** Service binding → svc-notify */
  SVC_NOTIFY: Fetcher
  /** Service binding → svc-astro (核心算力引擎，拥有 Gemini + DeepSeek AI keys) */
  SVC_ASTRO: Fetcher
  /**
   * Optional Cloudflare AI Search instance — portfolio reading memory (CoinCast / dreamoracle).
   * Configure in wrangler `ai_search` when an instance ID is available; omit for local dev.
   */
  PORTFOLIO_MEMORY_AI_SEARCH?: AiSearchInstance
  /** Service binding → svc-mailer (AWS SES 事务邮件) */
  SVC_MAILER: Fetcher
  SVC_ADMIN_NOTIFY: Fetcher
  /** R2 桶 — 用户持久化媒体（头像、手相照片、风水平面图） */
  MEDIA_BUCKET: R2Bucket
  ENVIRONMENT: string
  REVENUECAT_WEBHOOK_SECRET?: string
  /** Service-to-service token for iOS app DDL resolve endpoint */
  DDL_SERVICE_TOKEN?: string
  /** Cloudflare Turnstile secret key (Web 端人机验证) */
  TURNSTILE_SECRET?: string
  /** Chart-specific rate limiter (stricter than global) */
  CHART_RATE_LIMITER: RateLimit
  /** Analytics Engine dataset — validated growth funnel events */
  GROWTH_FUNNEL_ANALYTICS: AnalyticsEngineDataset
  /** R2 桶 — 事件归档 (NDJSON) */
  ANALYTICS_BUCKET: R2Bucket
  /** Service-to-service shared secret (svc-notify, svc-signal → hexastral-api) */
  INTERNAL_KEY: string
  /** Apple Sign In — JWT signing: Team ID (10-char) */
  APPLE_TEAM_ID?: string
  /** Apple Sign In — JWT signing: Key ID from .p8 file */
  APPLE_KEY_ID?: string
  /** Apple Sign In — JWT signing: PKCS8 private key PEM (.p8 contents) */
  APPLE_PRIVATE_KEY?: string
  /**
   * KV cache bust version for archetype presets.
   * Bump from 'v1' → 'v2' after editing D1 content to invalidate all stale KV entries.
   * Defaults to 'v1' if unset.
   */
  ARCHETYPE_CACHE_VERSION?: string
}

export interface ContextVariables {
  requestId: string
  userId?: string
  /** Set by internal-key middleware when a valid X-Internal-Key is provided */
  internalCaller?: boolean
  db: AppDb
}

/** Unified Hono env — passed to every route and middleware */
export type AppEnv = { Bindings: CloudflareBindings; Variables: ContextVariables }
