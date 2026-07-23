import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'
import { APP_LAUNCH } from '@/lib/growth/launch-status'

/** Shared config for the per-brand homes (yuel / yuun / yaul / kanyu / syel). */

export type BrandLocale = 'en' | 'zh' | 'tw' | 'ja'

/** Narrow a route locale (en/zh/tw/ja) to a brand-home string set. */
export function pickLocale(locale: string): BrandLocale {
  if (locale === 'tw' || locale === 'zh-Hant' || locale === 'zh-TW') return 'tw'
  if (locale.startsWith('zh')) return 'zh'
  if (locale.startsWith('ja')) return 'ja'
  return 'en'
}

const CTA_LABELS: Record<BrandLocale, { ios: string; android: string; desktop: string }> = {
  en: {
    ios: 'Download on the App Store',
    android: 'Get it on Google Play',
    desktop: 'Get the app',
  },
  zh: { ios: '在 App Store 下载', android: '在 Google Play 获取', desktop: '获取 App' },
  tw: { ios: '在 App Store 下載', android: '在 Google Play 取得', desktop: '取得 App' },
  ja: { ios: 'App Store で入手', android: 'Google Play で入手', desktop: 'アプリを入手' },
}

export const BRAND_STORE = {
  yuel: {
    ios: resolveAppStoreUrl('soulmatch'),
    android: 'https://play.google.com/store/apps/details?id=app.hexastral.yuel',
    labels: CTA_LABELS,
  },
  yuun: {
    ios: resolveAppStoreUrl('auspice'),
    android: 'https://play.google.com/store/apps/details?id=app.hexastral.yuun',
    labels: CTA_LABELS,
  },
  yaul: {
    ios: resolveAppStoreUrl('coincast'),
    android: 'https://play.google.com/store/apps/details?id=com.hexastral.coincast',
    labels: CTA_LABELS,
  },
  kanyu: {
    ios: resolveAppStoreUrl('fengshui'),
    android: 'https://play.google.com/store/apps/details?id=com.hexastral.feng',
    labels: CTA_LABELS,
  },
  syel: {
    ios: resolveAppStoreUrl('faceoracle'),
    android: 'https://play.google.com/store/apps/details?id=com.hexastral.xingqi',
    labels: CTA_LABELS,
  },
} as const

export type BrandId = keyof typeof BRAND_STORE

/** Per-app privacy appendix paths — synced with `APP_LAUNCH[].privacyPath`. */
export const BRAND_LEGAL_PATHS: Record<BrandId, { privacy: string; terms: string }> = {
  yuel: { privacy: APP_LAUNCH.yuel.privacyPath, terms: '/terms' },
  yuun: { privacy: APP_LAUNCH.yuun.privacyPath, terms: '/terms' },
  yaul: { privacy: APP_LAUNCH.yaul.privacyPath, terms: '/terms' },
  kanyu: { privacy: APP_LAUNCH.kanyu.privacyPath, terms: '/terms' },
  syel: { privacy: APP_LAUNCH.syel.privacyPath, terms: '/terms' },
}

/** Locale-prefixed path for brand subdomain legal links (`localePrefix: as-needed`). */
export function localePath(locale: string, path: string): string {
  const l = pickLocale(locale)
  if (l === 'en') return path
  return `/${l}${path}`
}
