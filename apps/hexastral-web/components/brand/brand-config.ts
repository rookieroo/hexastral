/** Shared config for the per-brand homes (yuel/yuun.hexastral.com). */

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

// NOTE: placeholder store IDs — swap for the real ASC / Play IDs once the
// listings exist (the same REPLACE markers the apps use elsewhere).
export const BRAND_STORE = {
  yuel: {
    ios: 'https://apps.apple.com/app/idREPLACE_YUEL',
    android: 'https://play.google.com/store/apps/details?id=app.hexastral.yuel',
    labels: CTA_LABELS,
  },
  yuun: {
    ios: 'https://apps.apple.com/app/idREPLACE_YUUN',
    android: 'https://play.google.com/store/apps/details?id=app.hexastral.yuun',
    labels: CTA_LABELS,
  },
} as const
