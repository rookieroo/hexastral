/**
 * DEV-only Pro preview by userId ALLOWLIST — the safe shape of a dev override.
 *
 * Why an allowlist (not a global `DEV_FORCE_PRO`): blast radius. A global flag
 * makes EVERY user Pro, so leaking it to prod = whole-userbase free Pro. An
 * allowlist only ever grants Pro to the handful of dev userIds named in
 * `DEV_PRO_USER_IDS`, so an accidental prod setting leaks to a few KNOWN accounts,
 * and it's auditable. (Per-user is also safer than per-app: a `DEV_PRO_APPS`
 * style flag would unlock for ALL users of an app.)
 *
 * Server-authoritative: we trust this server-side env, NEVER a client-sent flag —
 * so it previews kindred's server-gated data (the timeline withholds Pro nodes at
 * the source) WITHOUT weakening the paywall in prod, where DEV_PRO_USER_IDS is
 * empty. A dev adds their own userId to the api's `.dev.vars`.
 *
 * Central by design: the check lives in `userHasCapability` (one place); a gate
 * opts into the preview simply by passing its request `Context`. Gates that don't
 * pass `c` are completely unaffected.
 */

import type { Context } from 'hono'
import type { AppEnv } from '../../infra-types'

export function isDevForcedPro(c: Context<AppEnv>): boolean {
  // Not in CloudflareBindings (it's a dev-only .dev.vars var) — read defensively.
  const raw = (c.env as { DEV_PRO_USER_IDS?: string }).DEV_PRO_USER_IDS
  if (!raw) return false
  const userId = c.get('userId')
  if (!userId) return false
  return raw
    .split(',')
    .map((id) => id.trim())
    .some((id) => id.length > 0 && id === userId)
}
