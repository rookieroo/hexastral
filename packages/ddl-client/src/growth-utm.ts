/**
 * Merge URL query attribution with cookies set by hexastral-web middleware.
 * Query params win on key collision (last-click context).
 *
 * Safe to call only in the browser (no-op helpers return {} on server).
 */

const GROWTH_UTM_COOKIE = 'growth_utm'
const GROWTH_CLICK_IDS_COOKIE = 'growth_click_ids'
const UTM_KEY_PREFIX = 'utm_'

/** Ad click / browser match keys persisted alongside UTMs. */
export const CLICK_ID_KEYS = [
  'fbclid',
  'gclid',
  'ttclid',
  'rdt_cid',
  '_fbp',
  '_fbc',
] as const

export type ClickIdKey = (typeof CLICK_ID_KEYS)[number]

function parseCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const row = document.cookie.split('; ').find((r) => r.startsWith(`${name}=`))
  if (!row) return null
  return row.slice(name.length + 1)
}

function readJsonCookie(name: string): Record<string, string> {
  const raw = parseCookie(name)
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

/** Read JSON object previously stored by middleware (30d). */
export function readPersistedGrowthUtm(): Record<string, string> {
  return readJsonCookie(GROWTH_UTM_COOKIE)
}

/** Read click-id cookie previously stored by middleware (30d). */
export function readPersistedClickIds(): Record<string, string> {
  const fromCookie = readJsonCookie(GROWTH_CLICK_IDS_COOKIE)
  const out: Record<string, string> = {}
  for (const k of CLICK_ID_KEYS) {
    const v = fromCookie[k]
    if (v) out[k] = v
  }
  return out
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

/** Build `meta.clickIds` for DDL: cookie first, then current URL (URL overrides). */
export function mergeClickIdsForDdl(searchParams: URLSearchParams): Record<string, string> {
  const fromCookie = readPersistedClickIds()
  const fromUrl: Record<string, string> = {}
  for (const k of CLICK_ID_KEYS) {
    const v = searchParams.get(k)
    if (v && v.length > 0) fromUrl[k] = v
  }
  return { ...fromCookie, ...fromUrl }
}
