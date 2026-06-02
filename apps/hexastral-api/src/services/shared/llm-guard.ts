/**
 * Shared LLM cost/quality guard — "Conservative Mode v1" (Phase K · K.4).
 *
 * A platform capability consumed by every low-cost LLM surface (Auspice's
 * `/cycle/explain`, future fate-app AI 命盘解读, etc.) so cost policy is defined
 * ONCE here, never forked app-by-app. Sibling to `divination-guard.ts`: that one
 * gates *content* (abuse / dedup); this one gates *cost* (rate / budget / tier).
 *
 * Conservative Mode invariants:
 *   - No periodic rewards, no streak minting, no refill loops. Daily keys simply
 *     expire (a natural daily reset), they are never topped up as a "reward".
 *   - Hard per-subject daily limits + a global daily budget cap.
 *   - Always degrade gracefully (cache → template) — never a blank error-only
 *     response.
 *   - Optional ONE-TIME lifetime "peak pass" for the first wow moment (deep tier).
 *
 * Identity priority for quotas: userId > HMAC deviceId > ipHash.
 *
 * Model routing lives in the shared CF router (`@zhop/ai-vision/router`, invoked
 * via svc-astro). This guard governs ALLOWANCE only — it emits a `tier` hint
 * ('default' | 'deep') that gates how many LLM grants a subject gets, not which
 * model runs. The router picks the model by task: flagship (Kimi K2.6 → Qwen3 → GLM)
 * for readings/reports/Pro chat; standard (Qwen3 → GLM) for explain/signal/Free chat.
 *
 * Pattern mirrors divination-guard: read-decide (`evaluateLlmGuard`) then
 * record after a successful generation (`recordLlmGuardGrant`).
 */

// ── Decision contract ─────────────────────────────────────────────────────────

export type LlmGuardDecision =
  | 'allow_llm' // run the model (see `tier`)
  | 'allow_cached' // serve a cached generation (global budget exhausted)
  | 'allow_template' // serve a deterministic template (subject exhausted)
  | 'soft_gate' // reserved: template + gentle upsell (not produced by v1)
  | 'hard_gate' // reserved: block + upsell (v1 never blocks — always degrades)

export type LlmGuardTier = 'default' | 'deep'

export type LlmGuardSubjectKind = 'user' | 'device' | 'ip'

export interface LlmGuardSubject {
  kind: LlmGuardSubjectKind
  id: string
}

export interface LlmGuardConfig {
  /** Feature namespace, e.g. 'cycle' — scopes budget + limit KV keys. */
  app: string
  /** Daily LLM allowance for anonymous (device / ip) subjects. */
  dailyLimitAnon: number
  /** Daily LLM allowance for signed-in (user) subjects. */
  dailyLimitSigned: number
  /** One-time lifetime "peak" passes (deep tier). 0 disables. */
  lifetimePeakPass: number
  /** Global daily budget — total LLM grants across all subjects for this app. */
  globalDailyBudget: number
  /** Conservative-Mode invariants — must stay true. */
  noRollover: true
  noPeriodicRefill: true
}

export interface LlmGuardCounts {
  subjectDailyUsed: number
  globalDailyUsed: number
  peakPassUsed: number
}

export interface LlmGuardComputeResult {
  decision: LlmGuardDecision
  tier: LlmGuardTier
  reason: string
  /** When true, the caller should pass `consumesPeakPass` to recordLlmGuardGrant. */
  consumesPeakPass: boolean
  fallback: 'cache' | 'template' | null
  /** Surface a flagship/Pro upsell because the user just hit their limit. */
  upsellAfterExhaust: boolean
}

export type LlmGuardEvent =
  | {
      type: 'llm_guard_decision'
      app: string
      decision: LlmGuardDecision
      reason: string
      tier: LlmGuardTier
    }
  | { type: 'lifetime_peak_pass_consumed'; app: string }
  | { type: 'llm_fallback_type'; app: string; fallback: 'cache' | 'template' }
  | { type: 'upsell_exposed_after_exhaust'; app: string }

// ── Subject resolution (userId > deviceId > ipHash) ───────────────────────────

export function resolveLlmGuardSubject(input: {
  userId?: string | null
  deviceId?: string | null
  ipHash?: string | null
}): LlmGuardSubject | null {
  if (input.userId) return { kind: 'user', id: input.userId }
  if (input.deviceId) return { kind: 'device', id: input.deviceId }
  if (input.ipHash) return { kind: 'ip', id: input.ipHash }
  return null
}

// ── Pure decision (unit-testable) ─────────────────────────────────────────────

export function computeLlmGuardDecision(input: {
  subject: LlmGuardSubject
  config: LlmGuardConfig
  counts: LlmGuardCounts
}): LlmGuardComputeResult {
  const { subject, config, counts } = input

  // 1. Global daily budget cap — protect total spend. Degrade to cache (the
  //    caller falls back to template if no cache), never a blank error.
  if (counts.globalDailyUsed >= config.globalDailyBudget) {
    return {
      decision: 'allow_cached',
      tier: 'default',
      reason: 'global_budget_exhausted',
      consumesPeakPass: false,
      fallback: 'cache',
      upsellAfterExhaust: false,
    }
  }

  // 2. Per-subject daily allowance (no rollover, no refill — keys just expire).
  const dailyLimit = subject.kind === 'user' ? config.dailyLimitSigned : config.dailyLimitAnon
  if (counts.subjectDailyUsed < dailyLimit) {
    return {
      decision: 'allow_llm',
      tier: 'default',
      reason: 'within_daily_limit',
      consumesPeakPass: false,
      fallback: null,
      upsellAfterExhaust: false,
    }
  }

  // 3. Over the daily limit — spend the one-time lifetime peak pass (deep tier).
  if (config.lifetimePeakPass > 0 && counts.peakPassUsed < config.lifetimePeakPass) {
    return {
      decision: 'allow_llm',
      tier: 'deep',
      reason: 'lifetime_peak_pass',
      consumesPeakPass: true,
      fallback: null,
      upsellAfterExhaust: false,
    }
  }

  // 4. Exhausted — serve a deterministic template + surface the upsell. Never block.
  return {
    decision: 'allow_template',
    tier: 'default',
    reason: 'daily_exhausted',
    consumesPeakPass: false,
    fallback: 'template',
    upsellAfterExhaust: true,
  }
}

// ── KV-backed evaluate + record ───────────────────────────────────────────────

export interface LlmGuardEnv {
  GUARD_KV: KVNamespace
}

const DAILY_TTL_SECONDS = 172_800 // 2 days — daily keys expire (natural reset, never refilled)

function dateUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function subjectDailyKey(app: string, subject: LlmGuardSubject, date: string): string {
  return `llmguard:daily:${app}:${subject.kind}:${subject.id}:${date}`
}

function globalBudgetKey(app: string, date: string): string {
  return `llmguard:budget:${app}:${date}`
}

function peakPassKey(app: string, subject: LlmGuardSubject): string {
  return `llmguard:peakpass:${app}:${subject.kind}:${subject.id}`
}

function num(v: string | null): number {
  const n = Number(v ?? '0')
  return Number.isFinite(n) ? n : 0
}

/**
 * Read current counters, decide, and return the decision + the growth-funnel
 * event descriptors the caller should emit. Does NOT mutate state — call
 * `recordLlmGuardGrant` after a successful generation when `decision === 'allow_llm'`.
 */
export async function evaluateLlmGuard(
  env: LlmGuardEnv,
  input: { subject: LlmGuardSubject; config: LlmGuardConfig }
): Promise<LlmGuardComputeResult & { events: LlmGuardEvent[] }> {
  const { subject, config } = input
  const date = dateUtc()

  const [subjDaily, globalUsed, peakUsed] = await Promise.all([
    env.GUARD_KV.get(subjectDailyKey(config.app, subject, date)),
    env.GUARD_KV.get(globalBudgetKey(config.app, date)),
    env.GUARD_KV.get(peakPassKey(config.app, subject)),
  ])

  const result = computeLlmGuardDecision({
    subject,
    config,
    counts: {
      subjectDailyUsed: num(subjDaily),
      globalDailyUsed: num(globalUsed),
      peakPassUsed: num(peakUsed),
    },
  })

  const events: LlmGuardEvent[] = [
    {
      type: 'llm_guard_decision',
      app: config.app,
      decision: result.decision,
      reason: result.reason,
      tier: result.tier,
    },
  ]
  if (result.consumesPeakPass) events.push({ type: 'lifetime_peak_pass_consumed', app: config.app })
  if (result.fallback) {
    events.push({ type: 'llm_fallback_type', app: config.app, fallback: result.fallback })
  }
  if (result.upsellAfterExhaust) {
    events.push({ type: 'upsell_exposed_after_exhaust', app: config.app })
  }

  return { ...result, events }
}

/**
 * Record a granted generation (call after the LLM call succeeds). Increments the
 * subject's daily counter + the global budget counter, and consumes the lifetime
 * peak pass when used. No-ops the increment for cached/template (no LLM spend).
 */
export async function recordLlmGuardGrant(
  env: LlmGuardEnv,
  input: { subject: LlmGuardSubject; config: LlmGuardConfig; consumesPeakPass: boolean }
): Promise<void> {
  const { subject, config, consumesPeakPass } = input
  const date = dateUtc()

  const sKey = subjectDailyKey(config.app, subject, date)
  const subjCount = num(await env.GUARD_KV.get(sKey))
  await env.GUARD_KV.put(sKey, String(subjCount + 1), { expirationTtl: DAILY_TTL_SECONDS })

  const gKey = globalBudgetKey(config.app, date)
  const globalCount = num(await env.GUARD_KV.get(gKey))
  await env.GUARD_KV.put(gKey, String(globalCount + 1), { expirationTtl: DAILY_TTL_SECONDS })

  if (consumesPeakPass) {
    const pKey = peakPassKey(config.app, subject)
    const used = num(await env.GUARD_KV.get(pKey))
    await env.GUARD_KV.put(pKey, String(used + 1)) // lifetime — no TTL
  }
}
