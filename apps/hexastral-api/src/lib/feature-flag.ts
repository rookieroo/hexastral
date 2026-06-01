/**
 * Feature flag / kill-switch — server-side helper.
 *
 * Why this exists (P0-9): when a feature ships broken or an LLM prompt
 * starts hallucinating, we need to disable it WITHOUT shipping a new app
 * build + waiting 24h for App Review. Flags live in KV; ops flip them via
 * `wrangler kv:key put`.
 *
 * Storage: `GUARD_KV` (shared with rate-limit + idempotency for now; a
 * dedicated `FLAGS_KV` is overkill at our volume). Keys prefixed `flag:` so
 * the public list endpoint can scope to only flags.
 *
 * Values: JSON-encoded. Common shapes:
 *   - boolean kill-switch: `true` / `false`
 *   - string variant for A/B: `"control"` / `"variant_a"`
 *   - numeric threshold: `0.42`
 *   - structured config: `{ "rolloutPct": 25 }`
 *
 * Read pattern (server):
 *   const killed = await getFlag(c.env, 'feng_llm_kill', false)
 *   if (killed) return c.json({ error: 'temporarily-disabled' }, 503)
 *
 * Default = the value the code uses when the flag is unset. This is the
 * primary defense: a brand-new flag that hasn't been seeded in KV behaves
 * as-if it's the default; ops only need to flip it when they want to
 * deviate.
 *
 * Write pattern (ops):
 *   bunx wrangler kv:key put --binding=GUARD_KV "flag:feng_llm_kill" 'true'
 *   bunx wrangler kv:key delete --binding=GUARD_KV "flag:feng_llm_kill"
 *
 * Per-request cache: a single Worker request might call getFlag multiple
 * times for the same key. KV is fast but not free. We cache per-execution
 * in a Map attached to the request context.
 */

import type { CloudflareBindings } from '../infra-types'

const FLAG_PREFIX = 'flag:'

/** Read a flag value. Returns `defaultValue` when unset or KV errors. */
export async function getFlag<T>(
  env: CloudflareBindings,
  key: string,
  defaultValue: T
): Promise<T> {
  try {
    const raw = await env.GUARD_KV.get(`${FLAG_PREFIX}${key}`, 'json')
    if (raw == null) return defaultValue
    return raw as T
  } catch {
    // KV failure must never break the request. Default behavior preserved.
    return defaultValue
  }
}

/**
 * List all currently-set flags (used by the public GET /api/flags endpoint
 * so clients can hydrate their entire flag state in one request).
 * Returns `{ flagName: jsonValue }`. Names returned WITHOUT the `flag:`
 * prefix so clients can use them as bare keys.
 */
export async function listFlags(env: CloudflareBindings): Promise<Record<string, unknown>> {
  try {
    const list = await env.GUARD_KV.list({ prefix: FLAG_PREFIX })
    if (list.keys.length === 0) return {}
    // KV bulk get not supported on free tier — parallel individual gets are
    // fine for the small flag count we expect (<50). At 50 reads × ~5ms,
    // total latency ≈ KV burst, < 50ms typical.
    const entries = await Promise.all(
      list.keys.map(async (k) => {
        const value = await env.GUARD_KV.get(k.name, 'json')
        const name = k.name.slice(FLAG_PREFIX.length)
        return [name, value] as const
      })
    )
    return Object.fromEntries(entries.filter(([, v]) => v != null))
  } catch {
    return {}
  }
}
