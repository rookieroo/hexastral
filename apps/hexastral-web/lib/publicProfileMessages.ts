/**
 * Locale-aware copy for `/u/[username]`.
 *
 * `/u/*` lives outside the `[locale]` routing tree, so we resolve the message
 * bundle from the profile owner's stored `user.locale` rather than the URL.
 * Classical chart glyphs (stems/branches, star names, geju names) remain in
 * Chinese by design — see `publicProfileEnChartNote.ts`.
 */

type WebMsgLocale = 'en' | 'zh' | 'tw' | 'ja'

export interface PublicProfileMessages {
  plainIntroHeading: string
  joinedSince: string
  readingsCount: string
  baziHeading: string
  pillarYear: string
  pillarMonth: string
  pillarDay: string
  pillarHour: string
  ctaHeadline: string
  ctaSub: string
  ctaButton: string
  viewFullChart: string
}

const FALLBACK: PublicProfileMessages = {
  plainIntroHeading: 'HexAstral reading',
  joinedSince: 'On HexAstral since {year}',
  readingsCount: '{n} readings',
  baziHeading: 'Ba Zi · Four pillars',
  pillarYear: 'Year',
  pillarMonth: 'Month',
  pillarDay: 'Day',
  pillarHour: 'Hour',
  ctaHeadline: 'Discover your cosmic blueprint',
  ctaSub: 'AI-powered Ba Zi & Purple Star astrology — free on iOS',
  ctaButton: 'Download on the App Store',
  viewFullChart: 'View full chart (pillars + palaces)',
}

export function resolvePublicProfileMessageLocale(
  appLocale: string | null | undefined
): WebMsgLocale {
  const l = (appLocale ?? '').trim().toLowerCase()
  if (l.startsWith('zh-hant') || l === 'zh-tw' || l === 'tw') return 'tw'
  if (l.startsWith('zh')) return 'zh'
  if (l.startsWith('ja')) return 'ja'
  // ko removed — Korea is out of pre-PMF market scope.
  return 'en'
}

export async function getPublicProfileMessages(
  appLocale: string | null | undefined
): Promise<PublicProfileMessages> {
  const key = resolvePublicProfileMessageLocale(appLocale)
  const messages = (await import(`../messages/${key}.json`)).default as {
    publicProfile?: Partial<PublicProfileMessages>
  }
  const m = messages.publicProfile ?? {}
  return {
    plainIntroHeading: m.plainIntroHeading?.trim() || FALLBACK.plainIntroHeading,
    joinedSince: m.joinedSince?.trim() || FALLBACK.joinedSince,
    readingsCount: m.readingsCount?.trim() || FALLBACK.readingsCount,
    baziHeading: m.baziHeading?.trim() || FALLBACK.baziHeading,
    pillarYear: m.pillarYear?.trim() || FALLBACK.pillarYear,
    pillarMonth: m.pillarMonth?.trim() || FALLBACK.pillarMonth,
    pillarDay: m.pillarDay?.trim() || FALLBACK.pillarDay,
    pillarHour: m.pillarHour?.trim() || FALLBACK.pillarHour,
    ctaHeadline: m.ctaHeadline?.trim() || FALLBACK.ctaHeadline,
    ctaSub: m.ctaSub?.trim() || FALLBACK.ctaSub,
    ctaButton: m.ctaButton?.trim() || FALLBACK.ctaButton,
    viewFullChart: m.viewFullChart?.trim() || FALLBACK.viewFullChart,
  }
}

export function formatTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k]
    return v == null ? '' : String(v)
  })
}
