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
    title: 'Face reading · TikTok-ready landing · HexAstral',
    description:
      'AI-assisted Mian Xiang (面相). Upload teaser ships in FaceOracle — capture DDL + App Store funnel here.',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/lp/face'
          : `https://hexastral.com/${locale}/lp/face`,
    },
  }
}

export default async function LpFacePage() {
  return (
    <>
      <p
        style={{
          color: 'var(--color-gold)',
          letterSpacing: '0.2em',
          marginBottom: '0.35rem',
          fontSize: '0.75rem',
        }}
      >
        AD LANDING · FACE ORACLE
      </p>
      <h1 style={{ fontWeight: 400 }}>Upload once. Understand the poetry of your angles.</h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.7 }}>
        Portrait flows + Gemini-class vision scaffolding turn classical facial zones into structured
        notes — entertainment-grade, ethics-forward.
      </p>
      <DownloadCTA
        headline='Pre-order FaceOracle on the App Store'
        sub='Fingerprinted DDL retains UTMs captured in middleware cookies.'
        appStoreUrl={resolveAppStoreUrl('faceoracle')}
        targetApp='faceoracle'
      />
      <p style={{ fontSize: '0.82rem', color: 'var(--color-ivory-muted)' }}>
        Method primer:{' '}
        <Link href='/tools/face-reading' style={{ color: 'var(--color-gold)' }}>
          /tools/face-reading
        </Link>
      </p>
    </>
  )
}
