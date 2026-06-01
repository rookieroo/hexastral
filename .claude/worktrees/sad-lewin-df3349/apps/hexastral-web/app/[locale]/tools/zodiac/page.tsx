import type { Metadata } from 'next'
import { DownloadCTA } from '@/components/DownloadCTA'
import { ZodiacYearTool } from '@/app/[locale]/tools/zodiac/ZodiacYearTool'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Chinese zodiac by year — free tool · HexAstral',
    description:
      'Map a Gregorian year to the rotating zodiac animal (生肖) with caution near Lunar New Year. Deep charts need Ba Zi + Zi Wei in app.',
    alternates: {
      canonical:
        locale === 'en' ? 'https://hexastral.com/tools/zodiac' : `https://hexastral.com/${locale}/tools/zodiac`,
    },
  }
}

export default function ZodiacToolPage() {
  return (
    <>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, marginTop: 0 }}>Chinese zodiac lookup</h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.65 }}>
        Twelve animals anchor Chinese New Year folklore. Serious destiny work still uses{' '}
        <strong>Ba Zi</strong>
        （八字）and <strong>Zi Wei</strong>
        （紫微斗数）— zodiac alone is meme‑grade granularity.
      </p>
      <ZodiacYearTool />
      <DownloadCTA headline='Need Lunar boundary + pillars?' sub='Claim the flagship chart engine on iOS.' />
    </>
  )
}
