import type { Metadata } from 'next'
import { ShengXiaoYearTool } from '@/app/[locale]/tools/sheng-xiao/ShengXiaoYearTool'
import { DownloadCTA } from '@/components/DownloadCTA'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Sheng Xiao year lookup — free tool · HexAstral',
    description:
      'Map a Gregorian year to the rotating sheng xiao (生肖) animal with caution near Chinese New Year. Deep charts need Ba Zi + Zi Wei in app.',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/tools/sheng-xiao'
          : `https://hexastral.com/${locale}/tools/sheng-xiao`,
    },
  }
}

export default function ShengXiaoToolPage() {
  return (
    <>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, marginTop: 0 }}>Sheng Xiao lookup</h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.65 }}>
        Twelve animals anchor Chinese New Year folklore. Serious chart work still uses{' '}
        <strong>Ba Zi</strong>
        （八字）and <strong>Zi Wei</strong>
        （紫微斗数）— sheng xiao alone is meme‑grade granularity.
      </p>
      <ShengXiaoYearTool />
      <DownloadCTA
        headline='Need Lunar boundary + pillars?'
        sub='Claim the flagship chart engine on iOS.'
      />
    </>
  )
}
