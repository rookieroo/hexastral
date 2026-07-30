import type { Metadata } from 'next'
import { DownloadCTA } from '@/components/DownloadCTA'
import { Link } from '@/i18n/navigation'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'
import { canonicalUrl, NOINDEX_ROBOTS } from '@/lib/growth/page-metadata'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Day Master preview · EightPillars',
    robots: NOINDEX_ROBOTS,
    alternates: {
      canonical: canonicalUrl(locale, '/lp/personality'),
    },
  }
}

export default async function LpPersonalityPage() {
  return (
    <>
      <h1 style={{ fontWeight: 400 }}>Find your Day Master stem from your birth date.</h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.7 }}>
        A short preview of your 日元 (Day Master). For a full Ba Zi and Zi Wei chart with AI
        reading, open Yuel.
      </p>
      <Link
        href='/tools/day-master'
        style={{ color: 'var(--color-gold)', marginBottom: '1.25rem', display: 'inline-block' }}
      >
        Day Master preview →
      </Link>
      <DownloadCTA
        headline='Join the EightPillars waitlist'
        appStoreUrl={resolveAppStoreUrl('eightpillars')}
        targetApp='eightpillars'
      />
      <DownloadCTA headline='Full charts today: Yuel' compact targetApp='soulmatch' />
    </>
  )
}
