/**
 * /[locale]/face-oracle — Face Oracle satellite landing (Phase D.4 backfill).
 */

import type { Metadata } from 'next'
import { SatelliteLanding } from '../_satellite/SatelliteLanding'

interface Props {
  params: Promise<{ locale: string }>
}

type FaceOracleLandingCopy = {
  title: string
  subtitle: string
  body: string
  tryCta: string
  appCta: string
}

const COPY: Record<string, FaceOracleLandingCopy> & { en: FaceOracleLandingCopy } = {
  en: {
    title: 'Face Oracle',
    subtitle: 'Mian xiang for the camera era.',
    body: 'Face Oracle reads classical Chinese physiognomy from a single front-facing photo. The traits — brow, eye, nose, jaw — are extracted on-device, then mapped to a personality reading. Photos never leave your phone in raw form. Available on iOS.',
    tryCta: 'See what Face Oracle reads',
    appCta: 'Get Face Oracle on iOS',
  },
  zh: {
    title: '面相录',
    subtitle: '为相机时代而写的古法面相。',
    body: '面相录从一张正面照片读出古法面相：眉、眼、鼻、颌等特征在本机提取，映射为人格解读。原始照片不离开手机。仅 iOS 可用。',
    tryCta: '了解 Face Oracle 解读什么',
    appCta: 'iOS 下载 Face Oracle',
  },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const c = COPY[locale] ?? COPY.en
  return { title: `${c.title} · HexAstral`, description: c.subtitle }
}

export default async function FaceOracleLandingPage({ params }: Props) {
  const { locale } = await params
  const copy = COPY[locale] ?? COPY.en
  return (
    <SatelliteLanding
      locale={locale}
      tryHref='/face-oracle/try'
      glyph='相'
      glyphColor='#3C2415'
      copy={copy}
    />
  )
}
