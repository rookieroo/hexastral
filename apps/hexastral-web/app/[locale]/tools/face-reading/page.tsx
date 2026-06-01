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
    title: 'AI physiognomy primer — FaceOracle roadmap',
    description:
      'Classical face reading (Mian Xiang 面相) with strict privacy posture. Structured AI assists feature notes — selfies stay ephemeral.',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/tools/face-reading'
          : `https://hexastral.com/${locale}/tools/face-reading`,
    },
  }
}

export default function FaceReadingTeaserPage() {
  return (
    <>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, marginTop: 0 }}>
        Physiognomy teaser · 面相
      </h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.65 }}>
        <strong>FaceOracle</strong> will pair camera intake with Gemini-class vision routers for
        anatomical structuring, then layer interpretive prose that cites textual traditions instead
        of spooky guessing.
      </p>
      <ul style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.65, paddingLeft: '1rem' }}>
        <li>In-memory photo handling wherever technically possible</li>
        <li>Explicit consent screen before capture</li>
        <li>Share cards that watermark “AI-assisted cultural exploration”</li>
      </ul>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-ivory-muted)' }}>
        TikTok creatives: route paid traffic via{' '}
        <Link href='/lp/face' style={{ color: 'var(--color-gold)' }}>
          /lp/face
        </Link>{' '}
        once creatives are approved.
      </p>
      <DownloadCTA
        headline='Be first on FaceOracle'
        sub='App Store IDs arrive with the SKU; HexAstral already hosts premium face uploads for signed-in explorers.'
        appStoreUrl={resolveAppStoreUrl('faceoracle')}
        targetApp='faceoracle'
      />
    </>
  )
}
