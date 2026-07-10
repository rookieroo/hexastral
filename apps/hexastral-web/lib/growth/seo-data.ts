import { HIDDEN_PATH_PREFIXES, isPathIndexable } from './launch-status'

/** Static SEO slugs shared by sitemap + generateStaticParams */

export const DAY_MASTER_SLUGS = [
  'jia-wood',
  'yi-wood',
  'bing-fire',
  'ding-fire',
  'wu-earth',
  'ji-earth',
  'geng-metal',
  'xin-metal',
  'ren-water',
  'gui-water',
] as const

export type DayMasterSlug = (typeof DAY_MASTER_SLUGS)[number]

export const ZODIAC_SLUGS = [
  'rat',
  'ox',
  'tiger',
  'rabbit',
  'dragon',
  'snake',
  'horse',
  'goat',
  'monkey',
  'rooster',
  'dog',
  'pig',
] as const

export type ZodiacSlug = (typeof ZODIAC_SLUGS)[number]

export const PALACE_SLUGS = [
  'life-palace',
  'siblings',
  'spouse',
  'children',
  'wealth',
  'health',
  'travel',
  'friends',
  'career',
  'property',
  'fortune-spirit',
  'parents',
] as const

export type PalaceSlug = (typeof PALACE_SLUGS)[number]

export const FENG_SHUI_SLUGS = ['bedroom', 'office', 'front-door'] as const

export type FengShuiSlug = (typeof FENG_SHUI_SLUGS)[number]

/** All tool routes (including hidden teasers — filter with getIndexableToolPaths). */
export const TOOL_PATHS = [
  '/tools',
  '/tools/day-master',
  '/tools/hexagram',
  '/tools/dream',
  '/tools/sheng-xiao',
  '/tools/face-reading',
  '/tools/palace-chart',
  '/tools/compatibility',
] as const

export const CONTENT_BASE_PATHS = ['/about/methodology', '/blog'] as const

export const LP_PATHS = [
  '/lp/face',
  '/lp/twelve-palaces',
  '/lp/compatibility',
  '/lp/personality',
  '/lp/dream',
] as const

export function getIndexableToolPaths(): readonly string[] {
  return TOOL_PATHS.filter((p) => isPathIndexable(p))
}

export function getIndexableLpPaths(): readonly string[] {
  return LP_PATHS.filter((p) => isPathIndexable(p))
}

/** Paths that must never appear in sitemap (re-export for metadata helpers). */
export { HIDDEN_PATH_PREFIXES }
