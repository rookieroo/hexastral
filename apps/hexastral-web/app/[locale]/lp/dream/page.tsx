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
    title: 'Dream interpreter · DreamOracle search ads',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/lp/dream'
          : `https://hexastral.com/${locale}/lp/dream`,
    },
  }
}

export default async function LpDreamPage() {
  return (
    <>
      <h1 style={{ fontWeight: 400 }}>What did the ocean mean?</h1>
      <p style={{ color: 'var(--color-ivory-dim)' }}>
        Google Search intents (“dream interpretation”, “water dream meaning”) ladder into
        DreamOracle. Until launch, keep capturing UTMs via{' '}
        <code style={{ fontSize: '0.82rem' }}>/api/ddl</code> + Growth cookies.
      </p>
      <Link
        href='/tools/dream'
        style={{ color: 'var(--color-gold)', display: 'block', marginBottom: '1.25rem' }}
      >
        Editorial bridge → /tools/dream
      </Link>
      <DownloadCTA
        headline='Wishlist DreamOracle'
        appStoreUrl={resolveAppStoreUrl('dreamoracle')}
        targetApp='dreamoracle'
      />
      <DownloadCTA
        headline='Active oracle today: HexAstral I Ching'
        appStoreUrl={resolveAppStoreUrl('hexastral')}
        targetApp='hexastral'
      />
    </>
  )
}
