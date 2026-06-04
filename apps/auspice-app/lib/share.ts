import { Share } from 'react-native'

/**
 * Auspice share = a localized hook line + a link to a SERVER-RENDERED share page
 * on hexastral-web (`/s/*`). Every page carries an OG image (the iMessage/social
 * preview is the actual card, not a generic landing) AND an install CTA that
 * routes to the App Store via a DDL session — so the link is both shareable
 * (OG/SEO) and a real acquisition funnel.
 *
 * This replaced the old text-only `shareReading`, which pasted a wall of prose
 * into iMessage with hexastral.com ROOT as the only link (no preview, wrong
 * destination — the user flagged it as un-shareable). Plain text has no
 * virality; the card + a store-bound CTA does.
 */
const WEB_BASE = 'https://hexastral.com'

/** Localized "shared from" + soft CTA prepended to the share-page link. */
const TAGLINE: Record<string, string> = {
  'zh-Hans': '—— 由 Auspice 中华万年历生成 · 看看你的',
  'zh-Hant': '—— 由 Auspice 中華萬年曆生成 · 看看你的',
  ja: '—— Auspice 中華万年暦より · あなたのも見てみる',
  en: '— from Auspice, the Chinese calendar · see yours',
}

/**
 * Share a day's 宜忌 as a link to its SERVER-RENDERED share page
 * (hexastral.com/s/day/<date>). The page's OG image is a branded 宜忌 card, so the
 * iMessage/social link preview shows that card (the hook) + the page has an install
 * CTA. `date` = YYYY-MM-DD. (Direct PNG-file share is a follow-up.)
 */
export async function shareDayCard(date: string, locale = 'en'): Promise<void> {
  const tag = TAGLINE[locale] ?? TAGLINE.en
  try {
    await Share.share({ message: `${tag}\n${WEB_BASE}/s/day/${date}` })
  } catch {
    // cancelled — no-op
  }
}

/**
 * UTF-8 safe base64url encoder (matches /s/makeif/[token]'s decoder).
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

/**
 * Share a make-if (假如) fork as a link to its SERVER-RENDERED share page
 * (hexastral.com/s/makeif/<token>). The token base64url-encodes the fork
 * payload directly — no API round-trip, no auth. The page's OG image previews
 * the actual reading (not a generic landing), so a forwarded link feels
 * specific. Replaces the old text-only `shareReading` for make-if forks,
 * which dumped a wall of prose into iMessage with hexastral.com root as the
 * only CTA (a de-facto "404 reading-wise").
 *
 * Payload fields are intentionally short keys so the token stays bounded.
 */
export async function shareMakeifFork(
  fork: { forkTitle: string; label: string; outcome: string },
  locale = 'en'
): Promise<void> {
  const tag = TAGLINE[locale] ?? TAGLINE.en
  // Cap narrative at 900 chars before encoding — the page re-caps at 1200 but
  // a tighter URL keeps SMS / iMessage previews clean.
  const payload = JSON.stringify({
    t: fork.forkTitle.slice(0, 80),
    l: fork.label.slice(0, 80),
    o: fork.outcome.slice(0, 900),
    lc: locale,
  })
  const token = toBase64Url(payload)
  try {
    await Share.share({ message: `${tag}\n${WEB_BASE}/s/makeif/${token}` })
  } catch {
    // cancelled — no-op
  }
}

/**
 * Share a life-timeline snapshot as a link to `/s/timeline/<token>`. Scoped to
 * the user's CURRENT 大运 (10-year cycle) + this year's 流年 — per feedback that
 * the whole timeline is too long to convey in one frame, so we share "by 大运
 * unit". The OG image renders a compact 命 → 大运 → 流年 mini-graph + verdict.
 */
export async function shareTimeline(
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
): Promise<void> {
  const tag = TAGLINE[locale] ?? TAGLINE.en
  const payload = JSON.stringify({
    s: snap.source.slice(0, 12),
    d: snap.dayun.slice(0, 12),
    da: snap.dayunAges.slice(0, 16),
    y: snap.year,
    yp: snap.yearPillar.slice(0, 12),
    f: snap.fit,
    ad: snap.advice.slice(0, 300),
    lc: locale,
  })
  const token = toBase64Url(payload)
  try {
    await Share.share({ message: `${tag}\n${WEB_BASE}/s/timeline/${token}` })
  } catch {
    // cancelled — no-op
  }
}

/**
 * Share a 深度解读 (per-宜忌-field deep reading) as a link to `/s/explain/<token>`.
 * Replaces the old `shareReading` path the user flagged: that pasted the prose
 * as raw text + hexastral.com root; this previews the field + 干支日 as an OG
 * card and routes the CTA to the App Store.
 */
export async function shareExplain(
  reading: { date: string; ganZhi: string; field: string; isYi: boolean; explanation: string },
  locale = 'en'
): Promise<void> {
  const tag = TAGLINE[locale] ?? TAGLINE.en
  const payload = JSON.stringify({
    dt: reading.date.slice(0, 12),
    gz: reading.ganZhi.slice(0, 12),
    fl: reading.field.slice(0, 24),
    yi: reading.isYi,
    ex: reading.explanation.slice(0, 1000),
    lc: locale,
  })
  const token = toBase64Url(payload)
  try {
    await Share.share({ message: `${tag}\n${WEB_BASE}/s/explain/${token}` })
  } catch {
    // cancelled — no-op
  }
}
