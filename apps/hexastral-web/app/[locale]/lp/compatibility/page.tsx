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
    title: 'Bond reading · Yuel',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/lp/compatibility'
          : `https://hexastral.com/${locale}/lp/compatibility`,
    },
  }
}

export default async function LpCompatibilityPage() {
  return (
    <>
      <h1 style={{ fontWeight: 400 }}>
        Two charts, one bond — explore the shape of your connection
      </h1>
      <p style={{ color: 'var(--color-ivory-dim)' }}>
        A cultural bond reading (合盘) in Yuel — reflection on attraction and friction themes, not a
        compatibility score or prediction.
      </p>
      <Link
        href='/tools/compatibility'
        style={{ color: 'var(--color-gold)', marginBottom: '1.25rem', display: 'inline-block' }}
      >
        Try a free elemental preview →
      </Link>
      <DownloadCTA
        headline='Yuel — pair charts as a habit'
        appStoreUrl={resolveAppStoreUrl('soulmatch')}
        targetApp='soulmatch'
      />
    </>
  )
}
