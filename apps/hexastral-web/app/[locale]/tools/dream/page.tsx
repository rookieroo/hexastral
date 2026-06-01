import type { Metadata } from 'next'
import { DownloadCTA } from '@/components/DownloadCTA'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Dream interpreter roadmap — Zhou Gong lineage · HexAstral',
    description:
      'Planned DreamOracle satellite: Zhou Gong-inspired dream motifs plus reflective AI overlays. Landing soon — join HexAstral for live divination meanwhile.',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/tools/dream'
          : `https://hexastral.com/${locale}/tools/dream`,
    },
  }
}

export default function DreamTeaserToolPage() {
  return (
    <>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, marginTop: 0 }}>
        DreamInterpreter · 梦境
      </h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.65 }}>
        We&apos;re carving <strong>DreamOracle</strong> — text-first dream journaling with Zhou Gong
        motif vocabulary (<em>周公解梦</em>) plus Jungian scaffolding for English-native
        readability.
      </p>
      <div
        style={{
          padding: '1rem',
          border: '1px dashed var(--color-border)',
          borderRadius: 12,
          color: 'var(--color-ivory-muted)',
        }}
      >
        Web upload is intentionally paused while we tighten privacy narratives. Subscribe to
        HexAstral on iOS today for I Ching · destiny flows; DreamOracle inherits the same account
        graph when it ships.
      </div>
      <DownloadCTA
        headline='Try DreamOracle when it launches'
        sub='We will deeplink DDL sessions here. Flagship HexAstral already answers midnight questions via I Ching.'
        appStoreUrl={resolveAppStoreUrl('dreamoracle')}
        targetApp='dreamoracle'
      />
    </>
  )
}
