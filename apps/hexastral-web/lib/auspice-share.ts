/**
 * Shared copy for the Auspice `/s/*` share surface (OG images + tap-through
 * landings). Each share VARIANT (day · explain · timeline · makeif) markets its
 * OWN feature, so the eyebrow/header and the footer tagline are per-variant —
 * the generic "宜忌" footer is correct only for the day/explain cards, not for
 * the personalized timeline/makeif cards.
 *
 * Locale keys follow the TOKEN convention the mobile app emits in `lc`
 * (`zh-Hans` | `zh-Hant` | `ja` | `en`), NOT the web `[locale]` codes
 * (`zh`/`tw`). Always resolve through `pickCopy()` so an unknown locale falls
 * back to `en`.
 *
 * The footer's right-hand label points every Auspice share card at the
 * product's own landing page (`hexastral.com/auspice`), not the marketing root.
 */

/** The destination label shown on the right side of every `/s/*` OG footer. */
export const AUSPICE_FOOTER_LINK = 'hexastral.com/auspice'

/** The four shareable Auspice surfaces. */
export type AuspiceShareVariant = 'day' | 'explain' | 'timeline' | 'makeif'

export interface AuspiceVariantCopy {
  /** Spaced eyebrow / header line, e.g. "AUSPICE 黄历" or "AUSPICE · 人生时间线". */
  eyebrow: string
  /** Feature-specific footer tagline (left side of the OG footer). */
  footer: string
}

type LocaleMap = Record<string, AuspiceVariantCopy>

/**
 * Per-variant, per-locale eyebrow + footer. `en` is the guaranteed fallback for
 * every variant (see `pickCopy`).
 */
const COPY: Record<AuspiceShareVariant, LocaleMap> = {
  day: {
    en: { eyebrow: 'AUSPICE · ALMANAC', footer: 'Daily 干支 · lunar date · 节气 · 宜忌' },
    'zh-Hans': { eyebrow: 'AUSPICE 黄历', footer: '每日干支 · 农历 · 节气 · 宜忌' },
    'zh-Hant': { eyebrow: 'AUSPICE 黃曆', footer: '每日干支 · 農曆 · 節氣 · 宜忌' },
    ja: { eyebrow: 'AUSPICE 黄暦', footer: '干支 · 旧暦 · 二十四節気 · 宜忌' },
  },
  explain: {
    en: { eyebrow: 'AUSPICE · DEEP READING', footer: 'Why today favors what it favors' },
    'zh-Hans': { eyebrow: 'AUSPICE 深度解读', footer: '今天为什么宜这个、忌那个' },
    'zh-Hant': { eyebrow: 'AUSPICE 深度解讀', footer: '今天為什麼宜這個、忌那個' },
    ja: { eyebrow: 'AUSPICE 詳しい解説', footer: '今日、なぜそれが吉でそれが凶なのか' },
  },
  timeline: {
    en: {
      eyebrow: 'AUSPICE · LIFE TIMELINE',
      footer: 'Your life as a branching timeline · 大运 · 流年 · 流月',
    },
    'zh-Hans': {
      eyebrow: 'AUSPICE 人生时间线',
      footer: '大运 · 流年 · 流月 —— 把一生看成一条分叉的时间线',
    },
    'zh-Hant': {
      eyebrow: 'AUSPICE 人生時間線',
      footer: '大運 · 流年 · 流月 —— 把一生看成一條分叉的時間線',
    },
    ja: {
      eyebrow: 'AUSPICE 人生タイムライン',
      footer: '大運 · 流年 · 流月 —— 人生を枝分かれする時間軸として',
    },
  },
  makeif: {
    en: {
      eyebrow: 'AUSPICE · MAKE IF',
      footer: 'Explore a parallel life, drawn from your bāzì',
    },
    'zh-Hans': {
      eyebrow: 'AUSPICE 假如',
      footer: '八字推演 —— 探一条平行的人生',
    },
    'zh-Hant': {
      eyebrow: 'AUSPICE 假如',
      footer: '八字推演 —— 探一條平行的人生',
    },
    ja: {
      eyebrow: 'AUSPICE 假如',
      footer: '八字から導く、もう一つの人生',
    },
  },
}

/** Resolve the eyebrow + footer for a variant, falling back to `en`. */
export function pickCopy(variant: AuspiceShareVariant, lc: string | undefined): AuspiceVariantCopy {
  const byLocale = COPY[variant]
  return byLocale[lc ?? 'en'] ?? byLocale.en
}
