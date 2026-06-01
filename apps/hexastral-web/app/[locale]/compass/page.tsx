/**
 * /[locale]/compass — Compass satellite landing page (Phase E Week 2).
 *
 * Goals:
 *   1. Explain Compass (free 24-Mountain bagua compass with true-north correction) in ≤ 1 scroll
 *   2. CTA "Try compass in your browser" → /[locale]/compass/use
 *   3. Secondary CTA: install Compass on iOS
 *   4. SEO: capture "compass online", "magnetic declination", "羅盤 在線"
 *
 * Uses the shared SatelliteLanding component for visual consistency with the
 * other satellites — Compass is the first satellite with a CJK alias (羅)
 * per ADR-0003.
 */

import type { Metadata } from 'next'
import { SatelliteLanding } from '../_satellite/SatelliteLanding'

interface CompassLandingPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: CompassLandingPageProps): Promise<Metadata> {
  const { locale } = await params
  const titles: Record<string, string> & { en: string } = {
    en: 'Compass — 24-Mountain Bagua Compass · HexAstral',
    zh: '羅 · 二十四山罗盘 · HexAstral',
    tw: '羅 · 二十四山羅盤 · HexAstral',
    ja: '羅 · 二十四山コンパス · HexAstral',
  }
  const descriptions: Record<string, string> & { en: string } = {
    en: 'Free online compass with magnetic declination correction and the traditional 24-Mountain (二十四山) bagua ring. Works in the browser; install the app for offline + true-north accuracy.',
    zh: '免费在线罗盘，带磁偏角校正与传统二十四山八卦圈。浏览器即开即用；下载 App 可离线使用并获得真北精度。',
    tw: '免費線上羅盤，帶磁偏角校正與傳統二十四山八卦圈。瀏覽器即開即用；下載 App 可離線使用並獲得真北精度。',
    ja: '磁気偏角補正と伝統的な二十四山八卦リングを備えた無料オンラインコンパス。ブラウザですぐに利用可能。',
  }
  const title = titles[locale] ?? titles.en
  const description = descriptions[locale] ?? descriptions.en
  return {
    title,
    description,
    openGraph: { title, description, siteName: 'HexAstral' },
    alternates: {
      canonical: `https://hexastral.com/${locale === 'en' ? '' : `${locale}/`}compass`,
    },
  }
}

const COPY: Record<
  string,
  { title: string; subtitle: string; body: string; tryCta: string; appCta: string }
> = {
  en: {
    title: 'A compass that reads',
    subtitle: 'the world the old way',
    body: 'Compass shows the same 24-Mountain (二十四山) ring used in feng-shui for 1,400 years, with modern magnetic-declination correction so true north is actually true. Free in the browser. The iOS app adds offline use and bearing logging.',
    tryCta: 'Open the compass',
    appCta: 'Get Compass on iOS',
  },
  zh: {
    title: '一只读得懂',
    subtitle: '老黄历的罗盘',
    body: '罗盘显示风水沿用一千四百年的二十四山方位环，叠加现代磁偏角校正，让真北真的是真北。浏览器免费即开即用，iOS App 提供离线与朝向记录功能。',
    tryCta: '打开罗盘',
    appCta: 'iOS 下载罗',
  },
  tw: {
    title: '一只讀得懂',
    subtitle: '老黃曆的羅盤',
    body: '羅盤顯示風水沿用一千四百年的二十四山方位環，疊加現代磁偏角校正，讓真北真的是真北。瀏覽器免費即開即用，iOS App 提供離線與朝向記錄功能。',
    tryCta: '打開羅盤',
    appCta: 'iOS 下載羅',
  },
  ja: {
    title: '昔の知恵が読める',
    subtitle: 'コンパス',
    body: '風水で1,400年使われてきた二十四山リングと、磁気偏角の現代補正を組み合わせ、真北が本当に真北になります。ブラウザは無料。iOS版はオフライン利用と方位記録対応。',
    tryCta: 'コンパスを開く',
    appCta: 'iOSで羅',
  },
}

export default async function CompassLandingPage({ params }: CompassLandingPageProps) {
  const { locale } = await params
  const copy = COPY[locale] ?? COPY.en

  return (
    <SatelliteLanding
      locale={locale}
      tryHref='/compass/use'
      glyph='羅'
      glyphColor='#0F1E26'
      appStoreUrl='https://apps.apple.com/app/compass/id000000000'
      copy={{
        title: copy?.title ?? COPY.en?.title ?? '',
        subtitle: copy?.subtitle ?? COPY.en?.subtitle ?? '',
        body: copy?.body ?? COPY.en?.body ?? '',
        tryCta: copy?.tryCta ?? COPY.en?.tryCta ?? '',
        appCta: copy?.appCta ?? COPY.en?.appCta ?? '',
      }}
    />
  )
}
