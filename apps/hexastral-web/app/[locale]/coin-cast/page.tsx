/**
 * /[locale]/coin-cast — CoinCast satellite landing (Phase D.4 backfill).
 */

import type { Metadata } from 'next'
import { SatelliteLanding } from '../_satellite/SatelliteLanding'

interface Props {
  params: Promise<{ locale: string }>
}

type CoinCastLandingCopy = {
  title: string
  subtitle: string
  body: string
  tryCta: string
  appCta: string
}

const COPY: Record<string, CoinCastLandingCopy> & { en: CoinCastLandingCopy } = {
  en: {
    title: 'CoinCast',
    subtitle: 'Three coins. Six lines. One question.',
    body: 'CoinCast brings the I Ching ritual into your pocket. Tap or shake to cast — the lines build, a hexagram forms, and an AI reading meets the question you started with. Free to try in browser; the iOS app adds shake-to-cast and a private history.',
    tryCta: 'Try a cast in browser',
    appCta: 'Get CoinCast on iOS',
  },
  zh: {
    title: 'CoinCast',
    subtitle: '三枚铜钱，六爻一问。',
    body: 'CoinCast 把易经摇卦的仪式装进口袋。点击或摇动手机起卦——爻位积成一卦，AI 解读回应你最初的问题。浏览器即可免费体验；iOS 版新增摇杆起卦与私人占卜史。',
    tryCta: '在浏览器中起卦',
    appCta: 'iOS 下载 CoinCast',
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
      glyph='✦'
      glyphColor='#9B2226'
      copy={copy}
    />
  )
}
