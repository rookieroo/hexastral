export const PORTFOLIO_STORAGE_PREFIX = 'pf_lantai'
export const PORTFOLIO_TARGET_APP = 'lantai'

export const REVENUECAT_PRODUCT_IDS = {
  unlock: 'lantai_unlock',
  workspaces: 'lantai_workspaces',
  monthly: 'lantai_pro_monthly',
  annual: 'lantai_pro_annual',
} as const

export const LANTAI_SHORTCUT_NAME = 'Lantai'
export const LANTAI_BRAND_ORIGIN = 'https://lantai.hexastral.com'

function webLocaleFor(uiLocale: string): 'zh' | 'tw' | 'ja' | 'en' {
  if (uiLocale === 'zh') return 'zh'
  if (uiLocale === 'zh-Hant') return 'tw'
  if (uiLocale === 'ja') return 'ja'
  return 'en'
}

export function lantaiPrivacyUrl(uiLocale = 'en'): string {
  const seg = webLocaleFor(uiLocale)
  if (seg === 'en') return `${LANTAI_BRAND_ORIGIN}/privacy/lantai`
  return `${LANTAI_BRAND_ORIGIN}/${seg}/privacy/lantai`
}

export function lantaiTermsUrl(uiLocale = 'en'): string {
  const seg = webLocaleFor(uiLocale)
  if (seg === 'en') return `${LANTAI_BRAND_ORIGIN}/terms`
  return `${LANTAI_BRAND_ORIGIN}/${seg}/terms`
}

export function lantaiLandingUrl(uiLocale = 'en'): string {
  const seg = webLocaleFor(uiLocale)
  if (seg === 'en') return LANTAI_BRAND_ORIGIN
  return `${LANTAI_BRAND_ORIGIN}/${seg}`
}

export function lantaiSecretLinkUrl(configId: string): string {
  return `https://api.hexastral.com/s/${encodeURIComponent(configId)}`
}

export function lantaiShortcutRunUrl(configId: string): string {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(LANTAI_SHORTCUT_NAME)}&input=text&text=${encodeURIComponent(configId)}`
}
