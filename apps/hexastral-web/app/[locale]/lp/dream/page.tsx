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
    title: 'Dream notes · coming soon',
    robots: NOINDEX_ROBOTS,
    alternates: {
      canonical: canonicalUrl(locale, '/lp/dream'),
    },
  }
}

export default async function LpDreamPage() {
  return (
    <>
      <h1 style={{ fontWeight: 400 }}>What did the ocean mean?</h1>
      <p style={{ color: 'var(--color-ivory-dim)' }}>
        A dedicated dream journal app is coming soon. Until then, try our free dream notes tool, or
        explore Yuun&apos;s daily almanac.
      </p>
      <Link
        href='/tools/dream'
        style={{ color: 'var(--color-gold)', display: 'block', marginBottom: '1.25rem' }}
      >
        Free dream notes →
      </Link>
      <DownloadCTA
        headline='Wishlist when available'
        appStoreUrl={resolveAppStoreUrl('dreamoracle')}
        targetApp='dreamoracle'
      />
      <DownloadCTA
        headline='Today: Yuun almanac'
        appStoreUrl={resolveAppStoreUrl('auspice')}
        targetApp='auspice'
      />
    </>
  )
}
