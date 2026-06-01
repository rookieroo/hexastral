/**
 * Cultural materials — categories, Wikipedia links, re-exports.
 */

export {
  CULTURE_CATEGORIES,
  getCultureCategory,
  isCultureCategoryKey,
} from './categories'
export { getCultureEntryWikipediaUrl } from './entry-wikipedia'
export {
  localizeCultureEntry,
  localizeFestival,
  localizeSolarTermName,
} from './names'
export { CULTURE_SUMMARIES, cultureSummary } from './summaries'
export { localizePolarity, localizeWuxing } from './terms'
export type { CultureCategoryKey, CultureCategoryMaterial, LocalizedText } from './types'
export { getWikipediaUrl } from './wikipedia'
