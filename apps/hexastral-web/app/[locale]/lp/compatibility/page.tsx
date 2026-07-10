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
    title: 'Bond reading · Yuel funnel',
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
      <h1 style={{ fontWeight: 400 }}>Two charts, one bond — explore the shape of your connection</h1>
      <p style={{ color: 'var(--color-ivory-dim)' }}>
        Influencer-safe CTA for Eastern synastry (合盘). Full bond readings live in Yuel — cultural
        exploration and reflection, not a compatibility score or prediction.
      </p>
      <Link
        href='/tools/compatibility'
        style={{ color: 'var(--color-gold)', marginBottom: '1.25rem', display: 'inline-block' }}
      >
        Run the Turnstile preview tool →
      </Link>
      <DownloadCTA
        headline='Yuel — pair charts as a habit'
        appStoreUrl={resolveAppStoreUrl('soulmatch')}
        targetApp='soulmatch'
      />
    </>
  )
}
