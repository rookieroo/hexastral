import type { Metadata } from 'next'
import { NOINDEX_ROBOTS, canonicalUrl } from '@/lib/growth/page-metadata'
import { DownloadCTA } from '@/components/DownloadCTA'
import { Link } from '@/i18n/navigation'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Face & palm reading · Syel',
    description:
      'AI-assisted face and palm study (面相 · 掌相) for cultural exploration. Syel is coming soon.',
    robots: NOINDEX_ROBOTS,
    alternates: {
      canonical: canonicalUrl(locale, '/lp/face'),
    },
  }
}

export default async function LpFacePage() {
  return (
    <>
      <h1 style={{ fontWeight: 400 }}>Upload once. Understand the poetry of your angles.</h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.7 }}>
        Syel turns a clear face photo and palm images into structured notes grounded in classical
        physiognomy — entertainment and cultural study, not medical or fate claims.
      </p>
      <DownloadCTA
        headline='Syel — coming soon on the App Store'
        sub='Join when the listing opens.'
        appStoreUrl={resolveAppStoreUrl('faceoracle')}
        targetApp='faceoracle'
      />
      <p style={{ fontSize: '0.82rem', color: 'var(--color-ivory-muted)' }}>
        Method primer:{' '}
        <Link href='/tools/face-reading' style={{ color: 'var(--color-gold)' }}>
          Face reading overview
        </Link>
      </p>
    </>
  )
}
