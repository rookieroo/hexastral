/**
 * Cache + fetch for LLM-generated personal-reading chapters — the shared engine
 * behind Yuel's solo reading and (soon) Yuun's personal deep read.
 *
 * The signing / storage / api-url are INJECTED so each app brings its own HMAC
 * signer, AsyncStorage, and config (Phase 0c of the Yuel/Yuun split). The logic is
 * identical to the original kindred reading-cache; only the deps are now parameters.
 *
 * Keyed by chapter slug + chartHash (per-chart: editing birth changes the hash and
 * misses the cache). Signed-in users fetch real chapters over the injected signer
 * and cache them; callers without a device secret get null and the screen falls back
 * to its local template. The report reads the server-side chart, so we first bootstrap
 * it via the (idempotent) POST /api/natal.
 */

export interface CachedChapter {
  slug: string
  chartHash: string
  content: string
  generatedAt: string // ISO timestamp
}

export interface ReadingBirthInputs {
  solarDate: string
  timeIndex: number
  gender: '男' | '女'
}

/** The AsyncStorage-shaped persistence the cache reads/writes through. */
export interface ReadingCacheStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

/** HMAC signer — returns signed headers, or null when no device secret (signed out). */
export type SignReadingRequest = (args: {
  body: string
  userId: string
  method: string
  path: string
}) => Promise<Record<string, string> | null>

export interface ReadingCacheConfig {
  /** Base API url (no trailing slash) the chapter/natal routes live under. */
  apiUrl: string
  signRequest: SignReadingRequest
  storage: ReadingCacheStorage
  /** Resolve the signed-in userId. Use this when the id lives outside AsyncStorage
   *  (e.g. auspice's secure-store `getPortfolioUserId()`). Takes precedence over
   *  `userIdKey`. */
  getUserId?: () => Promise<string | null>
  /** AsyncStorage key the provisioned userId lives under (the simple case — Yuel).
   *  Ignored when `getUserId` is supplied. */
  userIdKey?: string
  /** Per-app cache-key prefix (default keeps slugs namespaced per app). */
  cachePrefix?: string
  /** Per-app "chart bootstrapped" marker prefix. */
  chartReadyPrefix?: string
  /** Tag woven into POST /api/natal requestId (per-app, for tracing). */
  requestIdTag?: string
}

/** Compute a simple, deterministic hash of chart inputs for cache keying. */
export function computeChartHash(solarDate: string, timeIndex: number, gender: string): string {
  return `${solarDate}_${timeIndex}_${gender}`
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

/**
 * Result of a 换视角 (perspective re-roll) — a discriminated union so the caller
 * can render the new version, the soft "本月已用完" notice, or a Pro upsell.
 */
export type RerollResult =
  | { kind: 'ok'; chapter: CachedChapter }
  | { kind: 'exhausted'; used: number; limit: number; resetsOn: string }
  | { kind: 'needs_pro' }
  | { kind: 'error' }

/** One past version of a chapter (for the 历史视角 compare view). Newest first. */
export interface ChapterVersion {
  content: string
  /** The ≤64-char perspective seed this version was re-rolled with; null = 原版. */
  perspectiveSeed: string | null
  generatedAt: string
}

export interface ReadingCache {
  getCachedChapter(slug: string, chartHash: string): Promise<CachedChapter | null>
  setCachedChapter(chapter: CachedChapter): Promise<void>
  fetchChapter(
    slug: string,
    chartHash: string,
    birth: ReadingBirthInputs
  ): Promise<CachedChapter | null>
  /** Re-roll a chapter with a perspective seed (≤64 chars). Updates the cache on
   *  success; surfaces the monthly-allowance / Pro gate to the caller. */
  rerollChapter(
    slug: string,
    chartHash: string,
    birth: ReadingBirthInputs,
    perspectiveSeed: string
  ): Promise<RerollResult>
  /** All saved versions of a chapter, newest first (Pro · 历史视角). [] on failure
   *  or when signed out / not Pro. */
  fetchChapterHistory(slug: string): Promise<ChapterVersion[]>
}

/** Build a reading cache bound to one app's signer / storage / api-url. */
export function createReadingCache(cfg: ReadingCacheConfig): ReadingCache {
  const { apiUrl, signRequest, storage, userIdKey } = cfg
  const cachePrefix = cfg.cachePrefix ?? 'reading_ch_'
  const chartReadyPrefix = cfg.chartReadyPrefix ?? 'chart_ready_v1_'
  const requestIdTag = cfg.requestIdTag ?? 'reading'

  const cacheKey = (slug: string, chartHash: string) => `${cachePrefix}${slug}_${chartHash}`

  async function getCachedChapter(slug: string, chartHash: string): Promise<CachedChapter | null> {
    try {
      const raw = await storage.getItem(cacheKey(slug, chartHash))
      if (!raw) return null
      return JSON.parse(raw) as CachedChapter
    } catch {
      return null
    }
  }

  async function setCachedChapter(chapter: CachedChapter): Promise<void> {
    try {
      await storage.setItem(cacheKey(chapter.slug, chapter.chartHash), JSON.stringify(chapter))
    } catch {
      // Non-critical — next open will re-fetch
    }
  }

  async function getUserId(): Promise<string | null> {
    try {
      if (cfg.getUserId) return await cfg.getUserId()
      return userIdKey ? await storage.getItem(userIdKey) : null
    } catch {
      return null
    }
  }

  /**
   * Signed request via the injected signer + `Bearer ${userId}` against apiUrl. Bound
   * with a 60s timeout: chapter generation is a slow inline LLM call; without a ceiling
   * a stalled connection leaves `fetch` pending forever → the report's Promise.all never
   * settles → the skeleton screen is stuck. On abort we return null so the caller
   * degrades to its placeholder + retry, never a frozen skeleton.
   */
  async function signedApiFetch(
    userId: string,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    timeoutMs = 60_000
  ): Promise<Response | null> {
    const requestBody = body != null ? JSON.stringify(body) : ''
    const signed = await signRequest({ body: requestBody, userId, method, path })
    if (!signed) return null
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(`${apiUrl}${path}`, {
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
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  const chartReadyKey = (userId: string, birth: ReadingBirthInputs) =>
    `${chartReadyPrefix}${userId}_${birth.solarDate}_${birth.timeIndex}_${birth.gender}`

  /**
   * Ensure the user's natal chart exists server-side (the report engine reads it).
   * POST /api/natal is idempotent; once it succeeds we remember it and stop re-POSTing
   * (re-calling it on every chapter burned the shared 5/min limiter → 429). A 429 is
   * treated as "proceed" — the limit is only hit because the chart is almost certainly
   * already there.
   */
  async function ensureServerChart(userId: string, birth: ReadingBirthInputs): Promise<boolean> {
    const key = chartReadyKey(userId, birth)
    try {
      if (await storage.getItem(key)) return true
    } catch {}
    try {
      const res = await signedApiFetch(userId, 'POST', '/api/natal', {
        solarDate: birth.solarDate,
        timeIndex: birth.timeIndex,
        gender: birth.gender,
        userId,
        requestId: `${requestIdTag}-${Date.now()}`,
      })
      if (res?.ok) {
        try {
          await storage.setItem(key, '1')
        } catch {}
        return true
      }
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
  async function fetchChapter(
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

  /**
   * Re-roll a chapter from a different perspective (Yuel Pro · metered). POSTs the
   * perspective seed; the server regenerates + flips the current version, so we
   * overwrite the local cache with the fresh prose. Maps the gate/allowance status
   * codes (402 / 429) to a discriminated result.
   */
  async function rerollChapter(
    slug: string,
    chartHash: string,
    birth: ReadingBirthInputs,
    perspectiveSeed: string
  ): Promise<RerollResult> {
    const userId = await getUserId()
    if (!userId) return { kind: 'needs_pro' }
    if (!(await ensureServerChart(userId, birth))) return { kind: 'error' }
    try {
      const res = await signedApiFetch(userId, 'POST', `/api/report/chapter/${slug}/reroll`, {
        perspectiveSeed,
      })
      if (!res) return { kind: 'error' }
      if (res.status === 402) return { kind: 'needs_pro' }
      if (res.status === 429) {
        const body = (await res.json().catch(() => ({}))) as {
          used?: number
          limit?: number
          resetsOn?: string
        }
        return {
          kind: 'exhausted',
          used: body.used ?? 0,
          limit: body.limit ?? 0,
          resetsOn: body.resetsOn ?? '',
        }
      }
      if (!res.ok) return { kind: 'error' }
      const json = (await res.json()) as { contentJson?: unknown; generatedAt?: string }
      const content = flattenChapterContent(json.contentJson)
      if (!content) return { kind: 'error' }
      const chapter: CachedChapter = {
        slug,
        chartHash,
        content,
        generatedAt: json.generatedAt ?? new Date().toISOString(),
      }
      await setCachedChapter(chapter)
      return { kind: 'ok', chapter }
    } catch {
      return { kind: 'error' }
    }
  }

  /** All versions of a chapter (newest first) for the 历史视角 compare view. */
  async function fetchChapterHistory(slug: string): Promise<ChapterVersion[]> {
    const userId = await getUserId()
    if (!userId) return []
    try {
      const res = await signedApiFetch(userId, 'GET', `/api/report/chapter/${slug}/history`)
      if (!res?.ok) return []
      const json = (await res.json()) as {
        items?: Array<{
          contentJson?: unknown
          perspectiveSeed?: string | null
          generatedAt?: string
        }>
      }
      const items = json.items ?? []
      return items
        .map((it) => ({
          content: flattenChapterContent(it.contentJson),
          perspectiveSeed: it.perspectiveSeed ?? null,
          generatedAt: it.generatedAt ?? '',
        }))
        .filter((v) => v.content.length > 0)
    } catch {
      return []
    }
  }

  return {
    getCachedChapter,
    setCachedChapter,
    fetchChapter,
    rerollChapter,
    fetchChapterHistory,
  }
}
