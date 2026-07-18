/**
 * Small UI strings shared by the Privacy + Terms pages, localised per app
 * locale. Sections (titles + body) live in `privacy-sections.ts` /
 * `terms-sections.ts`; this file is just the chrome around them.
 */

import type { Locale } from '@/i18n/routing'

export interface LegalUiStrings {
  privacyPageTitle: string
  termsPageTitle: string
  lastUpdatedLabel: string
  /** Sub-heading shown beneath the page title (Privacy only). */
  privacySubheading: string
  backToHome: string
  privacyLinkLabel: string
  termsLinkLabel: string
  /** Heading above the satellite-specific appendix list (Privacy only). */
  satelliteAppendicesHeading: string
}

const STRINGS: Record<Locale, LegalUiStrings> = {
  en: {
    privacyPageTitle: 'Privacy Policy',
    termsPageTitle: 'Terms of Service',
    lastUpdatedLabel: 'Last updated',
    privacySubheading:
      'Applies to HexAstral, Yuel, Yuun, Yaul, Kanyu, Xingqi, and all satellite apps published by UseONE, LLC',
    backToHome: '← Back to Home',
    privacyLinkLabel: 'Privacy Policy →',
    termsLinkLabel: 'Terms of Service →',
    satelliteAppendicesHeading: 'Satellite privacy appendices',
  },
  ja: {
    privacyPageTitle: 'プライバシーポリシー',
    termsPageTitle: '利用規約',
    lastUpdatedLabel: '最終更新日',
    privacySubheading:
      'UseONE, LLC が提供する HexAstral、Yuel、Yuun、Yaul、Kanyu、Xingqi、およびすべてのサテライトアプリに適用されます',
    backToHome: '← ホームへ戻る',
    privacyLinkLabel: 'プライバシーポリシー →',
    termsLinkLabel: '利用規約 →',
    satelliteAppendicesHeading: 'サテライトアプリ別の補足',
  },
  // zh / tw fall back to English content but localise the chrome so the page
  // doesn't look mixed-language. Once the section bodies are translated for
  // Simplified / Traditional Chinese these chrome strings already match.
  zh: {
    privacyPageTitle: '隐私政策',
    termsPageTitle: '使用条款',
    lastUpdatedLabel: '最近更新',
    privacySubheading:
      '适用于 UseONE, LLC 出品的 HexAstral、Yuel、Yuun、Yaul、Kanyu、Xingqi 以及所有卫星应用',
    backToHome: '← 返回首页',
    privacyLinkLabel: '隐私政策 →',
    termsLinkLabel: '使用条款 →',
    satelliteAppendicesHeading: '卫星应用补充说明',
  },
  tw: {
    privacyPageTitle: '隱私政策',
    termsPageTitle: '使用條款',
    lastUpdatedLabel: '最近更新',
    privacySubheading:
      '適用於 UseONE, LLC 出品的 HexAstral、Yuel、Yuun、Yaul、Kanyu、Xingqi 以及所有衛星應用',
    backToHome: '← 返回首頁',
    privacyLinkLabel: '隱私政策 →',
    termsLinkLabel: '使用條款 →',
    satelliteAppendicesHeading: '衛星應用補充說明',
  },
}

export function getLegalUiStrings(locale: Locale): LegalUiStrings {
  return STRINGS[locale]
}
