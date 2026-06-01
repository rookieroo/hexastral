/**
 * Cache + fetch for LLM-generated reading chapters.
 *
 * Keyed by chapter slug + chartHash (per-chart: editing birth changes the hash
 * and misses the cache). Signed-in users fetch real chapters from the report
 * engine over HMAC v2 and cache them; anonymous callers get null and the reading
 * screen falls back to its local template. The report reads the server-side
 * chart, so we first bootstrap it via the (idempotent) POST /api/natal.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getPortfolioUserId, resolvePortfolioApiUrl, signRequest } from '@zhop/satellite-runtime'

const CACHE_PREFIX = 'fate_reading_ch_'

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
    await AsyncStorage.setItem(
      cacheKey(chapter.slug, chapter.chartHash),
      JSON.stringify(chapter)
    )
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

/** Signed (HMAC v2) request, mirroring satellite-runtime's birth-info signer. */
async function signedApiFetch(
  userId: string,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<Response | null> {
  const requestBody = body != null ? JSON.stringify(body) : ''
  const signed = await signRequest({ body: requestBody, userId, method, path })
  if (!signed) return null
  return fetch(`${resolvePortfolioApiUrl()}${path}`, {
    method,
    headers: {
      ...(body != null ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
    ...(body != null ? { body: requestBody } : {}),
  })
}

/**
 * Ensure the user's natal chart exists server-side — the report engine reads the
 * `userCharts` table, which the satellite birth-sync doesn't populate. POST
 * /api/natal is idempotent (cached by input hash), so repeat calls are cheap.
 */
async function ensureServerChart(userId: string, birth: ReadingBirthInputs): Promise<boolean> {
  try {
    const res = await signedApiFetch(userId, 'POST', '/api/natal', {
      solarDate: birth.solarDate,
      timeIndex: birth.timeIndex,
      gender: birth.gender,
      userId,
      requestId: `fate-${Date.now()}`,
    })
    return !!res && res.ok
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
  const userId = await getPortfolioUserId()
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
