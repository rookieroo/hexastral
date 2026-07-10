/**
 * Single source of truth for which apps/SKUs are visible, indexable, and how they
 * are positioned (flagship vs funnel). Bump visibility per wave — see docs/ROADMAP.md
 * "Web disclosure".
 *
 * Wave unlock cheat sheet:
 *   W1 Yuun live  → yuun.visibility = 'live'
 *   W2 Yuel live  → yuel.visibility = 'live'
 *   W3 Kanyu live → kanyu.visibility = 'live', kanyu.brandHostIndexable = true, sync kanyu.png
 *   W4 Yaul live  → yaul.visibility = 'live'
 */

import type { GrowthAppStoreTarget } from './app-store-urls'

export type AppId = 'yuel' | 'yuun' | 'yaul' | 'kanyu'
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
    visibility: 'teaser',
    showOnHomepage: true,
    brandHostIndexable: true,
    brandHost: 'https://yuel.hexastral.com',
    storeTarget: 'soulmatch',
    privacyPath: '/privacy/kindred',
  },
  kanyu: {
    id: 'kanyu',
    displayName: 'Kanyu',
    role: 'flagship',
    visibility: 'teaser',
    showOnHomepage: true,
    brandHostIndexable: false,
    brandHost: 'https://kanyu.hexastral.com',
    storeTarget: 'fengshui',
    privacyPath: '/privacy/feng',
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
    privacyPath: '/privacy/auspice',
  },
  yaul: {
    id: 'yaul',
    displayName: 'Yaul',
    role: 'funnel',
    visibility: 'teaser',
    showOnHomepage: true,
    brandHostIndexable: false,
    brandHost: 'https://yaul.hexastral.com',
    storeTarget: 'coincast',
    privacyPath: '/privacy/coincast',
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

export function isPathIndexable(path: string): boolean {
  const normalized = path.split('?')[0] ?? path
  for (const hidden of HIDDEN_PATH_PREFIXES) {
    if (normalized === hidden || normalized.startsWith(`${hidden}/`)) return false
  }
  return true
}

/** Display order on hexastral.com (live row, then coming-soon row). */
export const HOMEPAGE_APP_ORDER: AppId[] = ['yuun', 'yuel', 'yaul', 'kanyu']

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

/** Default growth CTA when no per-page target is set — Yuel flagship. */
export const DEFAULT_STORE_TARGET: GrowthAppStoreTarget = 'soulmatch'
