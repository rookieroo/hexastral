/**
 * Merge URL query UTMs with the `growth_utm` cookie set by hexastral-web middleware.
 * Query params win on key collision (last-click context).
 *
 * Safe to call only in the browser (no-op on server).
 */
const GROWTH_UTM_COOKIE = 'growth_utm'
const UTM_KEY_PREFIX = 'utm_'

function parseCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const row = document.cookie.split('; ').find((r) => r.startsWith(`${name}=`))
  if (!row) return null
  return row.slice(name.length + 1)
}

/** Read JSON object previously stored by middleware (30d). */
export function readPersistedGrowthUtm(): Record<string, string> {
  const raw = parseCookie(GROWTH_UTM_COOKIE)
  if (!raw) return {}
  try {
    const decoded = decodeURIComponent(raw)
    const parsed = JSON.parse(decoded) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.length > 0) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

/** Build `meta.utm` for DDL: cookie first, then current URL (URL overrides). */
export function mergeUtmForDdl(searchParams: URLSearchParams): Record<string, string> {
  const fromCookie = Object.fromEntries(
    Object.entries(readPersistedGrowthUtm()).filter(([k]) => k.startsWith(UTM_KEY_PREFIX))
  )
  const fromUrl: Record<string, string> = {}
  for (const [k, v] of searchParams.entries()) {
    if (k.startsWith(UTM_KEY_PREFIX) && v.length > 0) fromUrl[k] = v
  }
  return { ...fromCookie, ...fromUrl }
}
