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
    title: 'Compatibility score · SoulMatch funnel',
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
      <h1 style={{ fontWeight: 400 }}>We scored 92% cosmic chemistry — wanna test ours?</h1>
      <p style={{ color: 'var(--color-ivory-dim)' }}>
        Influencer-safe CTA referencing Eastern synastry (合盘). Full Bond flows already live inside HexAstral.
      </p>
      <Link href='/tools/compatibility' style={{ color: 'var(--color-gold)', marginBottom: '1.25rem', display: 'inline-block' }}>
        Run the Turnstile preview tool →
      </Link>
      <DownloadCTA headline='SoulMatch — pair charts as a habit' appStoreUrl={resolveAppStoreUrl('soulmatch')} targetApp='soulmatch' />
      <DownloadCTA headline='Or stay on HexAstral flagship' compact targetApp='hexastral' />
    </>
  )
}
