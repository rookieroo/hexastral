/**
 * Relationship make-if presentation formatters (pure, locale-aware).
 *
 * The server engine (`planRelationshipDecision`) emits its verdict / reasons /
 * 用神 note in zh-Hans. Rather than localize the deterministic engine, Kindred
 * rebuilds the human strings client-side from each window's STRUCTURED flags
 * (isYongshen / feedsYongshen / harmony / clash / lean + the 用神 element), which
 * the DTO already carries. zh falls through to the engine's wording; en / ja get
 * a faithful translation. This keeps the engine testable and the US-first English
 * surface clean (no Chinese leaking into the UI).
 */

import type { DecisionLean, RelMakeIfResponse, RelMakeIfWindow, RelMakeIfYear } from '../types'
import type { KindredLocale } from './timeline-format'

const ELEMENT_NAME: Record<KindredLocale, Record<string, string>> = {
  en: { 金: 'Metal', 木: 'Wood', 水: 'Water', 火: 'Fire', 土: 'Earth' },
  zh: { 金: '金', 木: '木', 水: '水', 火: '火', 土: '土' },
  'zh-Hant': { 金: '金', 木: '木', 水: '水', 火: '火', 土: '土' },
  ja: { 金: '金', 木: '木', 水: '水', 火: '火', 土: '土' },
}

const EN_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** Localized 五行 element name (Latin for en, the glyph for CJK). */
export function elementName(element: string, locale: KindredLocale): string {
  return ELEMENT_NAME[locale][element] ?? element
}

/** Month label for a window — "Mar 2026" (en) / "2026年3月" (cjk). */
export function formatWindowMonth(w: RelMakeIfWindow, locale: KindredLocale): string {
  if (locale === 'en') return `${EN_SHORT[w.month - 1] ?? `M${w.month}`} ${w.year}`
  return `${w.year}年${w.month}月`
}

/** Short lean label for a chip. */
export function formatLean(lean: DecisionLean, locale: KindredLocale): string {
  switch (lean) {
    case 'favorable':
      switch (locale) {
        case 'zh':
        case 'zh-Hant':
          return '宜'
        case 'ja':
          return '好機'
        default:
          return 'Favorable'
      }
    case 'caution':
      switch (locale) {
        case 'zh':
          return '宜避'
        case 'zh-Hant':
          return '宜避'
        case 'ja':
          return '注意'
        default:
          return 'Caution'
      }
    default:
      switch (locale) {
        case 'zh':
        case 'zh-Hant':
          return '中性'
        case 'ja':
          return '平'
        default:
          return 'Mixed'
      }
  }
}

/** Localized reasons for one window, rebuilt from its structured flags. */
export function formatWindowReasons(
  w: RelMakeIfWindow,
  yongshen: string,
  locale: KindredLocale
): string[] {
  // zh keeps the engine's exact wording.
  if (locale === 'zh') return w.reasons

  const out: string[] = []
  const el = elementName(w.element, locale)
  const ys = elementName(yongshen, locale)

  if (w.isYongshen) {
    out.push(
      locale === 'ja'
        ? `流月の${el}が用神に当たり、気が最も通ります`
        : locale === 'zh-Hant'
          ? `流月${el}當令，正合用神，氣最順`
          : `${el} is in season — your bridging element, so energy flows best`
    )
  } else if (w.feedsYongshen) {
    out.push(
      locale === 'ja'
        ? `流月の${el}が用神${ys}を生じ、勢いを蓄えます`
        : locale === 'zh-Hant'
          ? `流月${el}生用神${ys}，為推進蓄勢`
          : `${el} feeds your bridging element ${ys} — momentum builds`
    )
  }
  if (w.harmony) {
    out.push(
      locale === 'ja'
        ? '流月が日支と合し、空気が和らぎます'
        : locale === 'zh-Hant'
          ? '流月合日支，氣氛和緩'
          : 'the month harmonizes a day branch — a softer mood'
    )
  }
  if (w.clash) {
    out.push(
      locale === 'ja'
        ? '流月が日支と冲し、摩擦に注意'
        : locale === 'zh-Hant'
          ? '流月冲日支，留心摩擦'
          : 'the month clashes a day branch — mind the friction'
    )
  }
  return out
}

/** Localized synthesis verdict, rebuilt from the result's best/windows. */
export function formatVerdict(result: RelMakeIfResponse, locale: KindredLocale): string {
  if (locale === 'zh' && result.verdict) return result.verdict

  const windows = result.windows ?? []
  const best = windows.find((w) => w.key === result.bestKey)
  const ys = elementName(result.yongshen ?? '', locale)

  if (windows.length === 0 || !best) {
    switch (locale) {
      case 'zh-Hant':
        return '窗口內暫無明顯的時機差異，關係大致平穩，順其自然即可。'
      case 'ja':
        return 'この期間に大きな時機の差はありません。関係はおおむね穏やか、自然体で。'
      default:
        return 'No standout timing in this window — things look steady, so move at your own pace.'
    }
  }

  let worst = windows[0]!
  for (const w of windows) if (w.score < worst.score) worst = w

  const bestM = formatWindowMonth(best, locale)
  const worstM = formatWindowMonth(worst, locale)
  const hasWorst = worst.score < 0 && worst.key !== best.key

  if (locale === 'zh-Hant') {
    const head =
      best.score > 0
        ? `這段關係的用神是【${ys}】。未來這些窗口裡，${bestM}（${best.ganZhi}）最合用神，氣最順，宜在此前後推進重要的一步。`
        : `這段關係的用神是【${ys}】。未來沒有特別旺的時機，宜穩不宜急，把節奏放在日常經營上。`
    const tail = hasWorst
      ? `而${worstM}（${worst.ganZhi}）流月冲日支，宜避其鋒、少做重大決定。`
      : ''
    return `${head}${tail}（此為趨勢參考，非定論；真正的決定仍在你們手中。）`
  }
  if (locale === 'ja') {
    const head =
      best.score > 0
        ? `この関係の用神は【${ys}】。今後の窓では、${bestM}（${best.ganZhi}）が最も用神に合い、気が通ります。大事な一歩はこの前後に。`
        : `この関係の用神は【${ys}】。特に旺じる時機はなく、急がず日々の積み重ねを。`
    const tail = hasWorst
      ? `一方、${worstM}（${worst.ganZhi}）は流月が日支と冲。大きな決断は控えめに。`
      : ''
    return `${head}${tail}（これは傾向の参考であり、断定ではありません。決めるのはお二人です。）`
  }
  // en
  const head =
    best.score > 0
      ? `Your bridging element is ${ys}. Of the months ahead, ${bestM} (${best.ganZhi}) aligns best with it — lean into an important step around then.`
      : `Your bridging element is ${ys}. No month stands out as especially strong, so favor steadiness over haste and invest in the everyday.`
  const tail = hasWorst
    ? ` ${worstM} (${worst.ganZhi}), by contrast, clashes a day branch — best to avoid big decisions then.`
    : ''
  return `${head}${tail} (A directional read, not a verdict — the choice is yours.)`
}

// ── Long-horizon (10y) tier formatters — the yearly analogue of the above ──────

/** Year label for a row — "2026" (en) / "2026年" (cjk). */
export function formatYearLabel(y: RelMakeIfYear, locale: KindredLocale): string {
  return locale === 'en' ? String(y.year) : `${y.year}年`
}

/** Localized reasons for one year, rebuilt from its structured flags. */
export function formatYearReasons(
  y: RelMakeIfYear,
  yongshen: string,
  locale: KindredLocale
): string[] {
  if (locale === 'zh') return y.reasons // engine already says 流年

  const out: string[] = []
  const el = elementName(y.element, locale)
  const ys = elementName(yongshen, locale)

  if (y.isYongshen) {
    out.push(
      locale === 'ja'
        ? `流年の${el}が用神に当たり、この年は気が最も通ります`
        : locale === 'zh-Hant'
          ? `流年${el}當令，正合用神，這一年氣最順`
          : `${el} is in season this year — your bridging element, so energy flows best`
    )
  } else if (y.feedsYongshen) {
    out.push(
      locale === 'ja'
        ? `流年の${el}が用神${ys}を生じ、勢いを蓄えます`
        : locale === 'zh-Hant'
          ? `流年${el}生用神${ys}，為推進蓄勢`
          : `${el} feeds your bridging element ${ys} — momentum builds`
    )
  }
  if (y.harmony) {
    out.push(
      locale === 'ja'
        ? '流年が日支と合し、和やかな年'
        : locale === 'zh-Hant'
          ? '流年合日支，氣氛和緩'
          : 'the year harmonizes a day branch — a softer chapter'
    )
  }
  if (y.clash) {
    out.push(
      locale === 'ja'
        ? '流年が日支と冲し、摩擦に注意'
        : locale === 'zh-Hant'
          ? '流年冲日支，留心摩擦'
          : 'the year clashes a day branch — mind the friction'
    )
  }
  return out
}

/** Localized synthesis verdict for the 10-year tier, from result.longterm. */
export function formatLongtermVerdict(result: RelMakeIfResponse, locale: KindredLocale): string {
  const lt = result.longterm
  if (!lt) return ''
  if (locale === 'zh') return lt.verdict

  const years = lt.years
  const best = years.find((y) => y.key === lt.bestYearKey)
  const ys = elementName(result.yongshen ?? '', locale)

  if (years.length === 0 || !best) {
    switch (locale) {
      case 'zh-Hant':
        return '未來十年內沒有特別突出的時機，順其自然、重在日常經營。'
      case 'ja':
        return '今後十年に際立った時機はありません。急がず日々の積み重ねを。'
      default:
        return 'No standout year in the decade ahead — favor steadiness and invest in the everyday.'
    }
  }

  let worst = years[0]!
  for (const y of years) if (y.score < worst.score) worst = y
  const hasWorst = worst.score < 0 && worst.key !== best.key

  if (locale === 'zh-Hant') {
    const head =
      best.score > 0
        ? `這段關係的用神是【${ys}】。未來十年裡，${best.year}年（${best.ganZhi}）最合用神，氣最順，宜把重大的一步放在這一年前後。`
        : `這段關係的用神是【${ys}】。未來十年沒有特別旺的年份，宜穩扎穩打。`
    const tail = hasWorst
      ? `而${worst.year}年（${worst.ganZhi}）流年冲日支，宜避其鋒、緩做重大決定。`
      : ''
    return `${head}${tail}（此為趨勢參考，非定論；真正的決定仍在你們手中。）`
  }
  if (locale === 'ja') {
    const head =
      best.score > 0
        ? `この関係の用神は【${ys}】。今後十年では、${best.year}年（${best.ganZhi}）が最も用神に合います。大きな一歩はこの年の前後に。`
        : `この関係の用神は【${ys}】。特に旺じる年はなく、着実に。`
    const tail = hasWorst
      ? `一方、${worst.year}年（${worst.ganZhi}）は流年が日支と冲。大きな決断は控えめに。`
      : ''
    return `${head}${tail}（傾向の参考であり、決めるのはお二人です。）`
  }
  // en
  const head =
    best.score > 0
      ? `Your bridging element is ${ys}. Over the next decade, ${best.year} (${best.ganZhi}) aligns best with it — a strong year to take a major step.`
      : `Your bridging element is ${ys}. No single year stands out over the next decade, so favor steadiness over haste.`
  const tail = hasWorst
    ? ` ${worst.year} (${worst.ganZhi}), by contrast, clashes a day branch — best to avoid big moves then.`
    : ''
  return `${head}${tail} (A directional read, not a verdict — the choice is yours.)`
}
