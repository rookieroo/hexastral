import { HEXAGRAM_LIST } from '@zhop/hexastral-tokens/constants/hexagram'
import type { Metadata } from 'next'
import { DownloadCTA } from '@/components/DownloadCTA'
import { Link } from '@/i18n/navigation'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: '64 I Ching hexagrams index — Zhou Yi reference',
    description:
      'Browse the King Wen sequence with Chinese names (卦名). Tap through for judgments and images sourced from HexAstral knowledge base.',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/tools/hexagram'
          : `https://hexastral.com/${locale}/tools/hexagram`,
    },
  }
}

export default function HexagramIndexPage() {
  return (
    <>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, marginTop: 0 }}>
        I Ching · 周易 hexagram index
      </h1>
      <p style={{ color: 'var(--color-ivory-dim)', marginBottom: '1.25rem', lineHeight: 1.65 }}>
        Each entry links to commentary suited for SERP snippets. Shake‑to‑oracle UX ships in
        HexAstral / forthcoming CoinCast.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.65rem',
        }}
      >
        {HEXAGRAM_LIST.map((h) => (
          <Link
            key={h.number}
            href={`/hexagram/${h.number}`}
            style={{
              padding: '0.65rem 0.5rem',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              textDecoration: 'none',
              color: 'var(--color-ivory)',
              textAlign: 'center',
              fontSize: '0.82rem',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div style={{ color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums' }}>
              #{h.number}
            </div>
            <div style={{ fontSize: '1.1rem' }}>
              {h.symbol} {h.name}
            </div>
            <div style={{ color: 'var(--color-ivory-muted)', textTransform: 'capitalize' }}>
              {h.pinyin}
            </div>
          </Link>
        ))}
      </div>
      <div style={{ marginTop: '2rem' }}>
        <DownloadCTA
          headline='Shake the hexagram in app'
          sub='Coins, lines, AI judgment — Liu Yao 六爻 in HexAstral.'
        />
      </div>
    </>
  )
}
