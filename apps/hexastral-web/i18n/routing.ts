import { defineRouting } from 'next-intl/routing'

export const locales = ['zh', 'tw', 'en', 'ja'] as const
export type Locale = (typeof locales)[number]

/** Map short locale codes to BCP-47 for use in Intl APIs */
export const localeToBcp47: Record<Locale, string> = {
  zh: 'zh-CN',
  tw: 'zh-TW',
  en: 'en-US',
  ja: 'ja-JP',
}

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  // Hide locale prefix for the default locale (en), show short codes for others
  localePrefix: 'as-needed',
  // Disable automatic locale detection — users stay on the URL they visit,
  // explicit language switcher controls locale changes
  localeDetection: false,
})
