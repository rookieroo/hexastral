/**
 * shichen-i18n — locale-aware display for the twelve 时辰.
 *
 * The 时辰 are East Asian double-hours named by the twelve earthly branches
 * (子丑寅…). For a CJK reader 「子时」is the natural label. For a Latin reader the
 * branch glyph is OPAQUE — shown as the dominant element it reads as an
 * untranslated string, not as flavour. So in Latin scripts we lead with the
 * universally-recognised Chinese-zodiac ANIMAL (Rat, Ox, …) and keep the clock
 * range as the functional anchor; the branch glyph survives only as a small
 * cultural seal.
 *
 * NOTE on the zodiac: each 时辰 carries an HOUR animal, NOT the reader's birth-
 * YEAR sign. Hosts should frame the field ("each two-hour window is named for a
 * zodiac animal") so a Dragon-year user isn't confused to see "Rat" for 23:00.
 *
 * ja / ko keep the kanji form — those scripts read 干支 natively (isCjkScript).
 * Single source of truth for the animal names + the script/suffix rules; the
 * branch + clock range live with each picker's own 时辰 table.
 */

/** Hour animals, indexed 0 = 子 (Rat) … 11 = 亥 (Pig). English (the only Latin locale). */
export const SHICHEN_ANIMALS_EN = [
  'Rat',
  'Ox',
  'Tiger',
  'Rabbit',
  'Dragon',
  'Snake',
  'Horse',
  'Goat',
  'Monkey',
  'Rooster',
  'Dog',
  'Pig',
] as const

/** Whether the locale reads 干支 natively (keep the CJK glyph). Defaults to true
 *  (the brand's native form) when no locale is given — so other apps that don't
 *  pass a locale keep their current Chinese display. */
export function isCjkScript(locale?: string): boolean {
  if (!locale) return true
  return locale.startsWith('zh') || locale.startsWith('ja') || locale.startsWith('ko')
}

/** The 「时/時」suffix for the 「子时」label — traditional 時 for zh-Hant / ja / ko,
 *  simplified 时 for zh-Hans. */
export function cjkHourSuffix(locale?: string): string {
  if (!locale) return '时'
  if (locale.startsWith('ja') || locale.startsWith('ko')) return '時'
  if (locale.startsWith('zh-Hant') || locale === 'zh-TW' || locale === 'zh-HK') return '時'
  return '时'
}

export interface ShichenDisplay {
  /** Render the CJK layout (branch glyph leads) vs the Latin layout (animal leads). */
  cjk: boolean
  /** CJK lead label, suffix-correct: 「子时」/「子時」. */
  cjkLabel: string
  /** Latin lead label: the zodiac animal, e.g. "Rat". */
  animal: string
  /** Earthly branch glyph 「子」— the CJK glyph, or a small Latin cultural seal. */
  branch: string
  /** Latin secondary line: 「Rat · 子」— animal + branch seal. */
  latinSub: string
}

/** Locale-aware display parts for one 时辰. `branch` is the picker's own glyph. */
export function shichenDisplay(index: number, branch: string, locale?: string): ShichenDisplay {
  const animal = SHICHEN_ANIMALS_EN[index] ?? ''
  return {
    cjk: isCjkScript(locale),
    cjkLabel: `${branch}${cjkHourSuffix(locale)}`,
    animal,
    branch,
    latinSub: `${animal} · ${branch}`,
  }
}

/** A single inline 时辰 label (for previews / summaries): 「未时」or 「Goat」. */
export function shichenInlineLabel(index: number, branch: string, locale?: string): string {
  const d = shichenDisplay(index, branch, locale)
  return d.cjk ? d.cjkLabel : d.animal
}

/**
 * Format a 24h "HH:MM" clock for the locale. CJK keeps 24h (the standard there);
 * Latin (e.g. US/en) converts to 12h AM/PM — Americans don't read 24h in everyday
 * life. The 时辰 boundaries are all odd whole hours, so this is unambiguous.
 */
export function formatHourMinute(hhmm: string, locale?: string): string {
  if (isCjkScript(locale)) return hhmm
  const [hStr, mStr] = hhmm.split(':')
  const h = Number(hStr)
  if (Number.isNaN(h)) return hhmm
  const m = Number(mStr ?? '0') || 0
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`
}

/** A 时辰 clock range ("23:00 – 01:00") localised: 24h for CJK, "11 PM – 1 AM" for Latin. */
export function shichenRange(range24: string, locale?: string): string {
  if (isCjkScript(locale)) return range24
  const [start, end] = range24.split(/\s*[–—-]\s*/)
  if (start == null || end == null) return range24
  return `${formatHourMinute(start, locale)} – ${formatHourMinute(end, locale)}`
}
