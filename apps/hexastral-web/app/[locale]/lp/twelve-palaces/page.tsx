import type { Metadata } from 'next'
import { DownloadCTA } from '@/components/DownloadCTA'
import { Link } from '@/i18n/navigation'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Twelve Palaces · ZiWei Chart Intro',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/lp/twelve-palaces'
          : `https://hexastral.com/${locale}/lp/twelve-palaces`,
    },
  }
}

export default async function LpTwelvePalacesPage() {
  return (
    <>
      <p style={{ color: 'var(--color-gold)', letterSpacing: '0.22em', fontSize: '0.72rem' }}>
        META AD · ZIWEI INTRO
      </p>
      <h1 style={{ fontWeight: 400 }}>Daily palace insights, anchored in classical ZiWei.</h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.7 }}>
        Notifications cite Zi Wei Dou Shu ( <span lang='zh-Hans'>紫微斗数</span>) — twelve palaces,
        decade cycles, source terms preserved.
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
        Peek at palace copy → /tools/palace-chart
      </Link>
      <DownloadCTA
        headline='Wishlist StarPalace'
        appStoreUrl={resolveAppStoreUrl('starpalace')}
        targetApp='starpalace'
      />
    </>
  )
}
