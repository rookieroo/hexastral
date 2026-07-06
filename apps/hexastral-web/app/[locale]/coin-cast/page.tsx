/**
 * /[locale]/coin-cast — Yaul (coincast) satellite landing on hexastral.com apex.
 * Brand home lives at yaul.hexastral.com; this page remains for SEO / legacy links.
 */

import type { Metadata } from 'next'
import { SatelliteLanding } from '../_satellite/SatelliteLanding'

interface Props {
  params: Promise<{ locale: string }>
}

type YaulLandingCopy = {
  title: string
  subtitle: string
  body: string
  tryCta: string
  appCta: string
}

const COPY: Record<string, YaulLandingCopy> & { en: YaulLandingCopy } = {
  en: {
    title: 'Yaul',
    subtitle: 'Three coins. Six lines. One question.',
    body: 'Yaul is an I Ching Liu Yao (六爻) study journal. Tap or shake to cast in 3D — the lines build, a hexagram forms, and AI commentary meets the question you started with. Free to try in browser; the iOS app adds shake-to-cast and a private history.',
    tryCta: 'Try a cast in browser',
    appCta: 'Get Yaul on iOS',
  },
  zh: {
    title: 'Yaul',
    subtitle: '三枚铜钱，六爻一问。',
    body: 'Yaul 是易经六爻研习工具。点击或摇动手机起卦——爻位积成一卦，AI 释读回应你最初的问题。浏览器即可免费体验；iOS 版新增摇杆起卦与私人卦象史。',
    tryCta: '在浏览器中起卦',
    appCta: 'iOS 下载 Yaul',
  },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const c = COPY[locale] ?? COPY.en
  return { title: `${c.title} · HexAstral`, description: c.subtitle }
}

export default async function CoinCastLandingPage({ params }: Props) {
  const { locale } = await params
  const copy = COPY[locale] ?? COPY.en
  return (
    <SatelliteLanding
      locale={locale}
      tryHref='/coin-cast/try'
      glyph='爻'
      glyphColor='#C4A882'
      copy={copy}
    />
  )
}
