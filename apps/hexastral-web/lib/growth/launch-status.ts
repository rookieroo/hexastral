/**
 * Single source of truth for which apps/SKUs are visible, indexable, and how they
 * are positioned (flagship vs funnel). Bump visibility per wave — see docs/ROADMAP.md
 * "Web disclosure".
 *
 * Wave unlock cheat sheet (edit APP_LAUNCH below, redeploy hexastral-web):
 *   W1 Yuun live  → yuun.visibility = 'live'   (current)
 *   W2 Yuel live  → yuel: visibility 'live', showOnHomepage true, brandHostIndexable true
 *   W3 Kanyu live → kanyu: same + sync kanyu.png / App Store URL
 *   W4 Yaul live  → yaul: same
 *   W5 Syel live  → syel: same (or teaser first if you want a homepage card before store)
 *
 * visibility:
 *   'live'   — homepage + CTAs + brand host + /lp + privacy appendix (+ indexable when flagged)
 *   'teaser' — homepage “coming soon”; brand host / lp / privacy allowed (soft presence)
 *   'hidden' — no homepage card, brand subdomain redirects to apex, /lp + /privacy/{id} gated
 */

import type { GrowthAppStoreTarget } from './app-store-urls'

export type AppId = 'yuel' | 'yuun' | 'yaul' | 'kanyu' | 'syel'
export type AppRole = 'flagship' | 'funnel'
export type Visibility = 'live' | 'teaser' | 'hidden'

export interface AppLaunchConfig {
  id: AppId
  displayName: string
  role: AppRole
  visibility: Visibility
  /** Include brand subdomain URLs in apex JSON-LD / SoftwareApplication. */
  showOnHomepage: boolean
  /** Index kanyu.hexastral.com etc. (brand sitemap is always minimal). */
  brandHostIndexable: boolean
  brandHost: string
  storeTarget: GrowthAppStoreTarget
  privacyPath: string
}

/** Shipping universe apps — edit visibility per launch wave. */
export const APP_LAUNCH: Record<AppId, AppLaunchConfig> = {
  yuel: {
    id: 'yuel',
    displayName: 'Yuel',
    role: 'flagship',
    visibility: 'hidden',
    showOnHomepage: false,
    brandHostIndexable: false,
    brandHost: 'https://yuel.hexastral.com',
    storeTarget: 'soulmatch',
    privacyPath: '/privacy/yuel',
  },
  kanyu: {
    id: 'kanyu',
    displayName: 'Kanyu',
    role: 'flagship',
    visibility: 'hidden',
    showOnHomepage: false,
    brandHostIndexable: false,
    brandHost: 'https://kanyu.hexastral.com',
    storeTarget: 'fengshui',
    privacyPath: '/privacy/kanyu',
  },
  yuun: {
    id: 'yuun',
    displayName: 'Yuun',
    role: 'funnel',
    visibility: 'live',
    showOnHomepage: true,
    brandHostIndexable: true,
    brandHost: 'https://yuun.hexastral.com',
    storeTarget: 'auspice',
    privacyPath: '/privacy/yuun',
  },
  yaul: {
    id: 'yaul',
    displayName: 'Yaul',
    role: 'funnel',
    visibility: 'hidden',
    showOnHomepage: false,
    brandHostIndexable: false,
    brandHost: 'https://yaul.hexastral.com',
    storeTarget: 'coincast',
    privacyPath: '/privacy/yaul',
  },
  syel: {
    id: 'syel',
    displayName: 'Syel',
    role: 'flagship',
    visibility: 'hidden',
    showOnHomepage: false,
    brandHostIndexable: false,
    brandHost: 'https://syel.hexastral.com',
    storeTarget: 'faceoracle',
    privacyPath: '/privacy/syel',
  },
}

export type HiddenSku =
  | 'dreamoracle'
  | 'faceoracle'
  | 'starpalace'
  | 'eightpillars'
  | 'hexastral-omnibus'

/** Routes for SKUs not in the current launch wave — never sitemap-listed. */
export const HIDDEN_PATH_PREFIXES = [
  '/tools/dream',
  '/tools/face-reading',
  '/tools/palace-chart',
  '/lp/dream',
  '/lp/face',
  '/lp/twelve-palaces',
  '/lp/personality',
  '/dream-oracle',
  '/face-oracle',
  '/onboarding',
] as const

export const HIDDEN_SKUS: Record<HiddenSku, { indexable: false }> = {
  dreamoracle: { indexable: false },
  faceoracle: { indexable: false },
  starpalace: { indexable: false },
  eightpillars: { indexable: false },
  'hexastral-omnibus': { indexable: false },
}

/**
 * Paths gated by APP_LAUNCH visibility (brand LPs + privacy appendices).
 * `/lp/face` is also in HIDDEN_PATH_PREFIXES until Syel waves; listed here so
 * unlocking Syel + removing the static hide opens both together.
 */
export const APP_GATED_PATHS: Record<AppId, readonly string[]> = {
  yuel: ['/lp/yuel', '/privacy/yuel'],
  yuun: ['/lp/yuun', '/privacy/yuun'],
  yaul: ['/privacy/yaul'],
  kanyu: ['/lp/kanyu', '/privacy/kanyu'],
  syel: ['/lp/face', '/privacy/syel'],
}

const LEGACY_PRIVACY_TO_APP: Record<string, AppId> = {
  kindred: 'yuel',
  auspice: 'yuun',
  feng: 'kanyu',
  coincast: 'yaul',
  xingqi: 'syel',
  faceoracle: 'syel',
}

const BRAND_HOST_TO_APP: { prefix: string; id: AppId }[] = [
  { prefix: 'yuel.', id: 'yuel' },
  { prefix: 'yuun.', id: 'yuun' },
  { prefix: 'yaul.', id: 'yaul' },
  { prefix: 'kanyu.', id: 'kanyu' },
  { prefix: 'syel.', id: 'syel' },
]

/** Strip locale prefix (`/zh`, `/tw`, `/ja`) for path matching. */
export function stripLocalePrefix(path: string): string {
  const normalized = (path.split('?')[0] ?? path) || '/'
  return normalized.replace(/^\/(zh|tw|ja)(?=\/|$)/, '') || '/'
}

/** Resolve brand AppId from Host header (yuel.hexastral.com → yuel). */
export function brandIdFromHost(host: string): AppId | null {
  const h = host.toLowerCase()
  for (const { prefix, id } of BRAND_HOST_TO_APP) {
    if (h.startsWith(prefix)) return id
  }
  return null
}

/** True when brand host /lp /privacy surfaces may be served (not `hidden`). */
export function appIsPublicSurface(id: AppId): boolean {
  return APP_LAUNCH[id].visibility !== 'hidden'
}

export function isAppId(value: string): value is AppId {
  return value in APP_LAUNCH
}

/**
 * Map /lp/* or /privacy/* (incl. legacy keys) to an AppId when gated by launch status.
 * Returns null for ungated paths.
 */
export function appIdForGatedPath(pathWithoutLocale: string): AppId | null {
  const p = stripLocalePrefix(pathWithoutLocale)
  for (const id of Object.keys(APP_GATED_PATHS) as AppId[]) {
    for (const prefix of APP_GATED_PATHS[id]) {
      if (p === prefix || p.startsWith(`${prefix}/`)) return id
    }
  }
  const legacy = p.match(/^\/privacy\/([^/]+)\/?$/)
  if (legacy?.[1]) {
    return LEGACY_PRIVACY_TO_APP[legacy[1]] ?? null
  }
  return null
}

/**
 * Apex origin for redirecting a locked brand host (kanyu.hexastral.com → hexastral.com).
 * Preserves proto + parent host for local / preview (kanyu.localhost → localhost).
 */
export function apexOriginFromRequest(opts: {
  host: string
  proto?: string | null
}): string {
  const proto = opts.proto ?? 'https'
  const host = opts.host || 'hexastral.com'
  const brandId = brandIdFromHost(host)
  if (!brandId) return `${proto}://${host}`
  const entry = BRAND_HOST_TO_APP.find((b) => b.id === brandId)
  const parent = entry && host.toLowerCase().startsWith(entry.prefix)
    ? host.slice(entry.prefix.length)
    : host
  return `${proto}://${parent || 'hexastral.com'}`
}

export function isPathIndexable(path: string): boolean {
  const normalized = stripLocalePrefix(path)
  for (const hidden of HIDDEN_PATH_PREFIXES) {
    if (normalized === hidden || normalized.startsWith(`${hidden}/`)) return false
  }
  const gatedApp = appIdForGatedPath(normalized)
  if (gatedApp && !appIsPublicSurface(gatedApp)) return false
  return true
}

/** Privacy appendix keys listed on /privacy — only non-hidden apps. */
export function getPublicPrivacyAppIds(): AppId[] {
  return (Object.keys(APP_LAUNCH) as AppId[]).filter((id) => appIsPublicSurface(id))
}

/** Display order on hexastral.com — ASC / listing order (not flagship vs funnel). */
export const HOMEPAGE_APP_ORDER: AppId[] = ['yuun', 'yuel', 'kanyu', 'yaul', 'syel']

function sortByHomepageOrder(apps: AppLaunchConfig[]): AppLaunchConfig[] {
  return [...apps].sort(
    (a, b) => HOMEPAGE_APP_ORDER.indexOf(a.id) - HOMEPAGE_APP_ORDER.indexOf(b.id)
  )
}

export function getVisibleApps(): AppLaunchConfig[] {
  return Object.values(APP_LAUNCH).filter((a) => a.visibility !== 'hidden')
}

export function getHomepageApps(): {
  flagship: AppLaunchConfig[]
  funnel: AppLaunchConfig[]
} {
  const visible = sortByHomepageOrder(APP_LAUNCH_CONFIG_ON_HOMEPAGE())
  return {
    flagship: visible.filter((a) => a.role === 'flagship'),
    funnel: visible.filter((a) => a.role === 'funnel'),
  }
}

/** Homepage layout: shipped (live) vs not yet shipped (teaser). */
export function getHomepageAppsByAvailability(): {
  live: AppLaunchConfig[]
  comingSoon: AppLaunchConfig[]
} {
  const visible = sortByHomepageOrder(APP_LAUNCH_CONFIG_ON_HOMEPAGE())
  return {
    live: visible.filter((a) => a.visibility === 'live'),
    comingSoon: visible.filter((a) => a.visibility === 'teaser'),
  }
}

function APP_LAUNCH_CONFIG_ON_HOMEPAGE(): AppLaunchConfig[] {
  return Object.values(APP_LAUNCH).filter((a) => a.showOnHomepage && a.visibility !== 'hidden')
}

export function appIsComingSoon(id: AppId): boolean {
  return APP_LAUNCH[id].visibility === 'teaser'
}

/** Default growth CTA when no per-page target is set — Yuun while other SKUs stay hidden. */
export const DEFAULT_STORE_TARGET: GrowthAppStoreTarget = 'auspice'
