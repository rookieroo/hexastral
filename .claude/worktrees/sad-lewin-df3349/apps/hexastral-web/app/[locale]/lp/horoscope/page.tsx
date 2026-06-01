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
    title: 'Eastern Horoscope landing · StarPalace',
    alternates: {
      canonical:
        locale === 'en' ? 'https://hexastral.com/lp/horoscope' : `https://hexastral.com/${locale}/lp/horoscope`,
    },
  }
}

export default async function LpHoroscopePage() {
  return (
    <>
      <p style={{ color: 'var(--color-gold)', letterSpacing: '0.22em', fontSize: '0.72rem' }}>META AD · STAR PALACE</p>
      <h1 style={{ fontWeight: 400 }}>The Co‑Star dopamine loop — anchored in twelve palaces.</h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.7 }}>
        Notifications read like horoscopes, citations keep saying Zi Wei Dou Shu ({' '}
        <span lang='zh-Hans'>紫微斗数</span>
        ).
      </p>
      <Link href='/tools/palace-chart' style={{ color: 'var(--color-gold)', fontSize: '0.85rem', display: 'block', marginBottom: '1.25rem' }}>
        Peek at palace copy → /tools/palace-chart
      </Link>
      <DownloadCTA headline='Wishlist StarPalace' appStoreUrl={resolveAppStoreUrl('starpalace')} targetApp='starpalace' />
    </>
  )
}
