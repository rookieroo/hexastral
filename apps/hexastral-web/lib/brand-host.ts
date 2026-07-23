import type { Locale } from '@/i18n/routing'

const BRAND_HOST_PREFIXES = ['yuel.', 'yuun.', 'yaul.', 'kanyu.', 'syel.'] as const

export function isBrandHost(host: string): boolean {
  return BRAND_HOST_PREFIXES.some((prefix) => host.startsWith(prefix))
}

/** True when the first Accept-Language tag is English. */
export function acceptLanguagePrefersEnglish(acceptLanguage: string | null): boolean {
  if (!acceptLanguage) return false
  const primary = acceptLanguage.split(',')[0]?.trim().split(';')[0]?.toLowerCase() ?? ''
  return primary === 'en' || primary.startsWith('en-')
}

const LOCALE_HOME_PATH: Record<Locale, string> = {
  en: '/',
  zh: '/zh',
  tw: '/tw',
  ja: '/ja',
}

function isLocale(value: string): value is Locale {
  return value === 'en' || value === 'zh' || value === 'tw' || value === 'ja'
}

/**
 * Brand subdomains (yuel / yuun / yaul / kanyu / syel) default to 简体中文 on the
 * **first** bare `/` visit only. Repeat visits and explicit `/` URLs serve
 * English (`localePrefix: as-needed`) so the locale switcher can move from
 * `/zh` → `/` without a stale `NEXT_LOCALE=zh` cookie forcing another redirect.
 *
 * Returns a redirect pathname (e.g. `/zh`) or `null` to let `/` serve English.
 */
export function resolveBrandRootRedirect(opts: {
  host: string
  localeCookie: string | null
  acceptLanguage: string | null
}): string | null {
  if (!isBrandHost(opts.host)) return null

  // Repeat visit: bare `/` is the English canonical path — never cookie-redirect.
  if (opts.localeCookie) return null

  if (acceptLanguagePrefersEnglish(opts.acceptLanguage)) return null

  return '/zh'
}

/** Map a stored locale cookie to the brand home path (locale switcher helper). */
export function localeCookieToHomePath(cookie: string | null): string | null {
  if (!cookie || !isLocale(cookie)) return null
  return LOCALE_HOME_PATH[cookie]
}
