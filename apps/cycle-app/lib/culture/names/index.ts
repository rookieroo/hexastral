/**
 * Localized display names for festivals, 节气, and culture entry routes.
 */

import { getFestivalContent } from '../../festival-content'
import type { Locale } from '../../i18n'
import { FESTIVAL_NAMES, localizeFestivalId } from './festivals'
import { localizeJieqiRouteId, localizeSolarTermName } from './solar-terms'

export { FESTIVAL_NAMES } from './festivals'
export { SOLAR_TERM_NAMES } from './solar-terms'

/** Best localized label for `/festival/[id]` and home chips. */
export function localizeCultureEntry(
  entryId: string,
  locale: Locale,
  apiFallback?: string
): string {
  const authored = getFestivalContent(entryId)?.name[locale]
  if (authored) return authored

  const festival = FESTIVAL_NAMES[entryId]?.[locale]
  if (festival) return festival

  const jieqi = localizeJieqiRouteId(entryId, locale)
  if (jieqi) return jieqi

  return apiFallback ?? entryId
}

export function localizeFestival(id: string, locale: Locale, apiName?: string): string {
  return localizeFestivalId(id, locale, apiName)
}

export { localizeSolarTermName }
