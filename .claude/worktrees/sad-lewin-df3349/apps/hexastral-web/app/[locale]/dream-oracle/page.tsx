/**
 * /[locale]/dream-oracle — Dream Oracle satellite landing (Phase D.4 backfill).
 */

import type { Metadata } from 'next'
import { SatelliteLanding } from '../_satellite/SatelliteLanding'

interface Props { params: Promise<{ locale: string }> }

const COPY: Record<string, { title: string; subtitle: string; body: string; tryCta: string; appCta: string }> = {
  en: {
    title: 'Dream Oracle',
    subtitle: 'A gentle reading of last night.',
    body: 'Type the dream you remember. Dream Oracle reads the imagery through Eastern oneiromancy + AI, giving back one short reflection — not a forecast. Free to try in browser; the iOS app keeps your private dream log.',
    tryCta: 'Read a dream',
    appCta: 'Get Dream Oracle on iOS',
  },
  zh: {
    title: '梦谕',
    subtitle: '为昨夜的梦，留一段温和的回响。',
    body: '把你记得的梦写下来。梦谕用东方解梦传统结合 AI，回应一段简短的反思——不预言、不武断。浏览器即可免费体验；iOS 版保留你的私人梦境记录。',
    tryCta: '读一个梦',
    appCta: 'iOS 下载梦谕',
  },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const c = COPY[locale] ?? COPY.en
  return { title: `${c.title} · HexAstral`, description: c.subtitle }
}

export default async function DreamOracleLandingPage({ params }: Props) {
  const { locale } = await params
  const copy = COPY[locale] ?? COPY.en
  return (
    <SatelliteLanding
      locale={locale}
      tryHref='/dream-oracle/try'
      glyph='✶'
      glyphColor='#3C2415'
      copy={copy}
    />
  )
}
