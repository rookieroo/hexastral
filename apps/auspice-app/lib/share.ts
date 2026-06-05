import { Share } from 'react-native'

/**
 * Auspice share = an IMAGE (captured on-device, see lib/imageShare) carrying a
 * caption: a localized hook line + a link to a SERVER-RENDERED `/s/*` page on
 * hexastral-web. The image is the instant, native preview (no Worker round-trip);
 * the URL is the tap-through funnel + SEO/OG fallback, and routes to the App
 * Store via a DDL session.
 *
 * This module owns the URL builders + the tagline. The `shareX(...)` functions
 * are the TEXT/URL-only fallback path (used where there's no view to capture);
 * the image-share callers compose `shareTaglineFor(locale) + xShareUrl(...)` as
 * the caption.
 *
 * Why not plain text: prose + hexastral.com ROOT has no virality (no preview,
 * wrong destination — the user flagged it). A card image + store-bound CTA does.
 */
const WEB_BASE = 'https://hexastral.com'

/** Localized "shared from" + soft CTA prepended to the share-page link. */
const EN_TAGLINE = '— from Auspice, the Chinese calendar · see yours'
const TAGLINE: Record<string, string> = {
  'zh-Hans': '—— 由 Auspice 中华万年历生成 · 看看你的',
  'zh-Hant': '—— 由 Auspice 中華萬年曆生成 · 看看你的',
  ja: '—— Auspice 中華万年暦より · あなたのも見てみる',
  en: EN_TAGLINE,
}

export function shareTaglineFor(locale = 'en'): string {
  return TAGLINE[locale] ?? EN_TAGLINE
}

// ── Per-variant share chrome (页眉 + 页脚) ─────────────────────────────────────
//
// The day (宜忌) card keeps its 黄历 footer (the default baked into ShareableCard).
// Timeline + make-if are important marketing entry points, so each gets its OWN
// eyebrow + footer line that sells THAT feature, not the generic 黄历 tagline.
// The landing label funnels to the app-specific page rather than the site root.

/** App-specific landing the share image funnels to (shown bottom-right). */
export const SHARE_LANDING = 'hexastral.com/auspice'

export interface ShareChrome {
  eyebrow: string
  footer: string
  url: string
}

const TIMELINE_FOOTER: Record<string, string> = {
  'zh-Hans': '大运 · 流年 · 流月 · 一生流年图',
  'zh-Hant': '大運 · 流年 · 流月 · 一生流年圖',
  ja: '大運 · 流年 · 一生の流れ',
  en: 'Your life as a branching 大运 timeline',
}

const TIMELINE_EYEBROW: Record<string, string> = {
  'zh-Hans': 'AUSPICE · 人生时间线',
  'zh-Hant': 'AUSPICE · 人生時間線',
  ja: 'AUSPICE · 人生タイムライン',
  en: 'AUSPICE · LIFE TIMELINE',
}

const MAKEIF_FOOTER: Record<string, string> = {
  'zh-Hans': '八字推演 · 看见另一种人生',
  'zh-Hant': '八字推演 · 看見另一種人生',
  ja: '四柱推命 · もうひとつの人生',
  en: 'Bazi what-if · see a parallel life',
}

const MAKEIF_EYEBROW: Record<string, string> = {
  'zh-Hans': 'AUSPICE · 假如人生',
  'zh-Hant': 'AUSPICE · 假如人生',
  ja: 'AUSPICE · もしもの人生',
  en: 'AUSPICE · MAKE-IF',
}

function pick(map: Record<string, string>, locale: string): string {
  return map[locale] ?? map.en ?? ''
}

export function timelineShareChrome(locale = 'en'): ShareChrome {
  return {
    eyebrow: pick(TIMELINE_EYEBROW, locale),
    footer: pick(TIMELINE_FOOTER, locale),
    url: SHARE_LANDING,
  }
}

export function makeifShareChrome(locale = 'en'): ShareChrome {
  return {
    eyebrow: pick(MAKEIF_EYEBROW, locale),
    footer: pick(MAKEIF_FOOTER, locale),
    url: SHARE_LANDING,
  }
}

/**
 * UTF-8 safe base64url encoder (matches the `/s/<kind>/[token]` decoders).
 *
 * RN's `btoa` only handles Latin-1, so a Chinese / Japanese narrative would
 * throw. We round through `encodeURIComponent → unescape` (the standard
 * unicode-to-binary trick) so each multi-byte code point gets serialized as
 * its UTF-8 bytes before base64.
 */
function toBase64Url(input: string): string {
  const utf8 = unescape(encodeURIComponent(input))
  return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ── URL builders (shared by image captions + the text/URL fallback) ───────────

/** `/s/day/<date>` — the day's 宜忌 card. `date` = YYYY-MM-DD. */
export function dayShareUrl(date: string): string {
  return `${WEB_BASE}/s/day/${date}`
}

/** `/s/makeif/<token>` — a make-if (假如) fork. `summary` (概要) is the at-a-glance
 *  takeaway shown next to the branch; it rides in the token (`sm`) so a forwarded
 *  share is legible without opening the app (the web OG renders it prominently). */
export function makeifShareUrl(
  fork: { forkTitle: string; label: string; outcome: string; summary?: string },
  locale = 'en'
): string {
  const token = toBase64Url(
    JSON.stringify({
      t: fork.forkTitle.slice(0, 80),
      l: fork.label.slice(0, 80),
      o: fork.outcome.slice(0, 900),
      ...(fork.summary ? { sm: fork.summary.slice(0, 160) } : {}),
      lc: locale,
    })
  )
  return `${WEB_BASE}/s/makeif/${token}`
}

/** `/s/timeline/<token>` — a life-timeline snapshot scoped to the current 大运. */
export function timelineShareUrl(
  snap: {
    source: string
    dayun: string
    dayunAges: string
    year: number
    yearPillar: string
    fit: '吉' | '平' | '凶'
    advice: string
  },
  locale = 'en'
): string {
  const token = toBase64Url(
    JSON.stringify({
      s: snap.source.slice(0, 12),
      d: snap.dayun.slice(0, 12),
      da: snap.dayunAges.slice(0, 16),
      y: snap.year,
      yp: snap.yearPillar.slice(0, 12),
      f: snap.fit,
      ad: snap.advice.slice(0, 300),
      lc: locale,
    })
  )
  return `${WEB_BASE}/s/timeline/${token}`
}

/** `/s/explain/<token>` — a per-宜忌-field 深度解读. */
export function explainShareUrl(
  reading: { date: string; ganZhi: string; field: string; isYi: boolean; explanation: string },
  locale = 'en'
): string {
  const token = toBase64Url(
    JSON.stringify({
      dt: reading.date.slice(0, 12),
      gz: reading.ganZhi.slice(0, 12),
      fl: reading.field.slice(0, 24),
      yi: reading.isYi,
      ex: reading.explanation.slice(0, 1000),
      lc: locale,
    })
  )
  return `${WEB_BASE}/s/explain/${token}`
}

// ── Text/URL-only fallback shares (no view to capture) ────────────────────────

async function shareUrl(url: string, locale: string): Promise<void> {
  try {
    await Share.share({ message: `${shareTaglineFor(locale)}\n${url}` })
  } catch {
    // cancelled — no-op
  }
}

export const shareDayCard = (date: string, locale = 'en') => shareUrl(dayShareUrl(date), locale)

export const shareMakeifFork = (
  fork: { forkTitle: string; label: string; outcome: string; summary?: string },
  locale = 'en'
) => shareUrl(makeifShareUrl(fork, locale), locale)

export const shareTimeline = (snap: Parameters<typeof timelineShareUrl>[0], locale = 'en') =>
  shareUrl(timelineShareUrl(snap, locale), locale)

export const shareExplain = (reading: Parameters<typeof explainShareUrl>[0], locale = 'en') =>
  shareUrl(explainShareUrl(reading, locale), locale)
