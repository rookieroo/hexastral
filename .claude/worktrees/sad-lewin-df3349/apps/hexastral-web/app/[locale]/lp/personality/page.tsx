import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { DownloadCTA } from '@/components/DownloadCTA'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Eastern personality type landing · EightPillars',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/lp/personality'
          : `https://hexastral.com/${locale}/lp/personality`,
    },
  }
}

export default async function LpPersonalityPage() {
  return (
    <>
      <h1 style={{ fontWeight: 400 }}>I&apos;m Bing Fire — drag your birth date.</h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.7 }}>
        Viral TikTok captions map to EightPillar cards; HexAstral still owns fused Ba Zi + Zi Wei for depth.
      </p>
      <Link href='/tools/day-master' style={{ color: 'var(--color-gold)', marginBottom: '1.25rem', display: 'inline-block' }}>
        Day Master teaser → /tools/day-master
      </Link>
      <DownloadCTA headline='EightPillars waitlist funnel' appStoreUrl={resolveAppStoreUrl('eightpillars')} targetApp='eightpillars' />
      <DownloadCTA headline='Depth today: HexAstral flagship' compact targetApp='hexastral' />
    </>
  )
}
