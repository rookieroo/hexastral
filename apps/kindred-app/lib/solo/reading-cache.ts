/**
 * Cache + fetch for LLM-generated solo reading chapters.
 * Ported from ming-pan-app/lib/reading-cache.ts per ADR-0021 K1 / ADR-0022,
 * ADAPTED to kindred-app's request signing: where ming-pan signed via
 * @zhop/satellite-runtime (getPortfolioUserId / resolvePortfolioApiUrl /
 * signRequest), kindred uses its own HMAC v2 signer (lib/hmac), config
 * (lib/config), and AsyncStorage-backed userId (the same `yuan_user_id` key
 * lib/auth.tsx provisions). House rule: requests are HMAC v2 signed, never raw.
 *
 * Keyed by chapter slug + chartHash (per-chart: editing birth changes the hash
 * and misses the cache). Signed-in users fetch real chapters from the report
 * engine over HMAC v2 and cache them; callers without a device secret get null
 * and the reading screen falls back to its local template. The report reads the
 * server-side chart, so we first bootstrap it via the (idempotent) POST /api/natal.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { config } from '../config'
import { signRequest } from '../hmac'

const CACHE_PREFIX = 'kindred_reading_ch_'

/** AsyncStorage key the userId is provisioned under (matches lib/auth.tsx). */
const USER_ID_KEY = 'yuan_user_id'

export interface CachedChapter {
  slug: string
  chartHash: string
  content: string
  generatedAt: string // ISO timestamp
}

function cacheKey(slug: string, chartHash: string) {
  return `${CACHE_PREFIX}${slug}_${chartHash}`
}

export async function getCachedChapter(
  slug: string,
  chartHash: string
): Promise<CachedChapter | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(slug, chartHash))
    if (!raw) return null
    return JSON.parse(raw) as CachedChapter
  } catch {
    return null
  }
}

export async function setCachedChapter(chapter: CachedChapter): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(chapter.slug, chapter.chartHash), JSON.stringify(chapter))
  } catch {
    // Non-critical — next open will re-fetch
  }
}

/**
 * Compute a simple hash of chart inputs for cache keying.
 * Doesn't need to be cryptographic — just deterministic + collision-resistant.
 */
export function computeChartHash(solarDate: string, timeIndex: number, gender: string): string {
  return `${solarDate}_${timeIndex}_${gender}`
}

/* ── server fetch (signed-in only) ─────────────────────────────────────── */

export interface ReadingBirthInputs {
  solarDate: string
  timeIndex: number
  gender: '男' | '女'
}

/** Subset of the report chapter `contentJson` we render as flowing prose. */
interface ReportChapterContent {
  summary?: string
  sections?: { heading?: string; body?: string }[]
}

/** Flatten the structured chapter JSON into the single prose block the reading renders. */
function flattenChapterContent(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return ''
  const c = raw as ReportChapterContent
  const parts: string[] = []
  if (typeof c.summary === 'string' && c.summary.trim()) parts.push(c.summary.trim())
  if (Array.isArray(c.sections)) {
    for (const s of c.sections) {
      const seg = [s?.heading, s?.body]
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .join('\n')
      if (seg) parts.push(seg)
    }
  }
  return parts.join('\n\n')
}

/** The provisioned userId, read from AsyncStorage (matches lib/auth.tsx). */
async function getUserId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(USER_ID_KEY)
  } catch {
    return null
  }
}

/**
 * Signed (HMAC v2) request, mirroring the kindred signer used by lib/user-api +
 * lib/inviteSubmit: signRequest from lib/hmac + `Bearer ${userId}` against
 * config.apiUrl. Returns null when no device secret is available (signed out).
 */
async function signedApiFetch(
  userId: string,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  // Bound EVERY signed call. Chapter generation is a slow inline LLM call; without
  // a ceiling a stalled connection leaves `fetch` pending forever → the report's
  // Promise.all never settles → the skeleton screen is stuck (the bug). On abort
  // we return null so the caller degrades to its placeholder + a retry, never a
  // frozen skeleton. Generous (60s) so a real generation isn't cut short.
  timeoutMs = 60_000
): Promise<Response | null> {
  const requestBody = body != null ? JSON.stringify(body) : ''
  const signed = await signRequest({ body: requestBody, userId, method, path })
  if (!signed) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        ...(body != null ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
      ...(body != null ? { body: requestBody } : {}),
      signal: controller.signal,
    })
  } catch {
    // Aborted (timeout) or a network error → null; callers fall back gracefully.
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Ensure the user's natal chart exists server-side — the report engine reads the
 * `userCharts` table, which the birth-sync doesn't populate. POST /api/natal is
 * idempotent (cached by input hash), so once it has succeeded we remember it and
 * stop re-POSTing: the previous behaviour re-called it on EVERY chapter fetch,
 * which burned the shared chart rate-limiter (5/min) and made the endpoint 429.
 * A 429 then made this return false → fetchChapter bailed → the report was stuck
 * on the "Synthesizing…" placeholder forever even though the chart existed. So we
 * also treat 429 as "proceed" (the limit is only hit because we've called it
 * enough already — i.e. the chart is almost certainly there).
 */
function chartReadyKey(userId: string, birth: ReadingBirthInputs): string {
  return `kindred_chart_ready_v1_${userId}_${birth.solarDate}_${birth.timeIndex}_${birth.gender}`
}

async function ensureServerChart(userId: string, birth: ReadingBirthInputs): Promise<boolean> {
  const key = chartReadyKey(userId, birth)
  try {
    if (await AsyncStorage.getItem(key)) return true
  } catch {}
  try {
    const res = await signedApiFetch(userId, 'POST', '/api/natal', {
      solarDate: birth.solarDate,
      timeIndex: birth.timeIndex,
      gender: birth.gender,
      userId,
      requestId: `kindred-${Date.now()}`,
    })
    if (res?.ok) {
      try {
        await AsyncStorage.setItem(key, '1')
      } catch {}
      return true
    }
    // 429 → throttled because we've already created it; don't block the report.
    return res?.status === 429
  } catch {
    return false
  }
}

/**
 * Fetch a real LLM chapter for a signed-in user, caching the flattened prose.
 * Returns null when signed out or on any failure — the caller falls back to its
 * local template placeholder.
 */
export async function fetchChapter(
  slug: string,
  chartHash: string,
  birth: ReadingBirthInputs
): Promise<CachedChapter | null> {
  const userId = await getUserId()
  if (!userId) return null
  if (!(await ensureServerChart(userId, birth))) return null
  try {
    const res = await signedApiFetch(userId, 'GET', `/api/report/chapter/${slug}`)
    if (!res?.ok) return null
    const json = (await res.json()) as { contentJson?: unknown; generatedAt?: string }
    const content = flattenChapterContent(json.contentJson)
    if (!content) return null
    const chapter: CachedChapter = {
      slug,
      chartHash,
      content,
      generatedAt: json.generatedAt ?? new Date().toISOString(),
    }
    await setCachedChapter(chapter)
    return chapter
  } catch {
    return null
  }
}
