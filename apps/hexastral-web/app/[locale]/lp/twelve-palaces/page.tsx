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
    title: 'Twelve Palaces · ZiWei intro',
    robots: NOINDEX_ROBOTS,
    alternates: {
      canonical: canonicalUrl(locale, '/lp/twelve-palaces'),
    },
  }
}

export default async function LpTwelvePalacesPage() {
  return (
    <>
      <h1 style={{ fontWeight: 400 }}>Daily palace insights, anchored in classical ZiWei.</h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.7 }}>
        Zi Wei Dou Shu (<span lang='zh-Hans'>紫微斗数</span>) — twelve palaces and decade cycles,
        with classical terms preserved. Full charts live in Yuel today.
      </p>
      <Link
        href='/tools/palace-chart'
        style={{
          color: 'var(--color-gold)',
          fontSize: '0.85rem',
          display: 'block',
          marginBottom: '1.25rem',
        }}
      >
        Browse palace overview →
      </Link>
      <DownloadCTA
        headline='Full Zi Wei charts in Yuel'
        appStoreUrl={resolveAppStoreUrl('soulmatch')}
        targetApp='soulmatch'
      />
      <DownloadCTA
        headline='Wishlist StarPalace (coming soon)'
        appStoreUrl={resolveAppStoreUrl('starpalace')}
        targetApp='starpalace'
      />
    </>
  )
}
