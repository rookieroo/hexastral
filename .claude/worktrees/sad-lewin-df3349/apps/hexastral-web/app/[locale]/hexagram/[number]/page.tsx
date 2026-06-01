import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HEXAGRAM_DETAILS } from '@zhop/hexastral-tokens/constants/hexagram'
import { Link } from '@/i18n/navigation'
import { JsonLd } from '@/lib/json-ld'

interface Props {
  params: Promise<{ locale: string; number: string }>
}

export function generateStaticParams() {
  return Array.from({ length: 64 }, (_, i) => ({ number: String(i + 1) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, number } = await params
  const n = Number(number)
  if (n < 1 || n > 64) return { title: 'Hexagram · HexAstral' }
  const h = HEXAGRAM_DETAILS.find((item) => item.number === n)
  if (!h) return { title: 'Hexagram · HexAstral' }
  const title = `Hexagram ${h.number}: ${h.name} (${h.pinyin}) — I Ching reference`
  return {
    title,
    description: `${h.judgmentExplain.slice(0, 140)}…`,
    alternates: {
      canonical:
        locale === 'en'
          ? `https://hexastral.com/hexagram/${number}`
          : `https://hexastral.com/${locale}/hexagram/${number}`,
    },
  }
}

export default async function HexagramDetailPage({ params }: Props) {
  const { locale, number } = await params
  const n = Number(number)
  if (Number.isNaN(n) || n < 1 || n > 64) notFound()

  const h = HEXAGRAM_DETAILS.find((item) => item.number === n)
  if (!h) notFound()
  void locale

  return (
    <article style={{ lineHeight: 1.7 }}>
      <JsonLd
        json={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: `${h.symbol} Hexagram ${h.number} (${h.name})`,
          dateModified: new Date().toISOString(),
          abstract: h.judgmentExplain,
          inLanguage: 'en-US',
          author: {
            '@type': 'Organization',
            name: 'HexAstral',
          },
        }}
      />
      <header>
        <p style={{ letterSpacing: '0.24em', color: 'var(--color-gold)', fontSize: '0.74rem', marginBottom: '0.35rem' }}>
          HEXAGRAM {h.number}/64 · 周易
        </p>
        <h1 style={{ margin: '0 0 0.5rem', fontWeight: 400, fontSize: '1.9rem' }}>
          {h.symbol} {h.name} <span style={{ color: 'var(--color-ivory-dim)' }}>({h.pinyin})</span>
        </h1>
        <p style={{ color: 'var(--color-ivory-dim)', fontSize: '0.92rem', marginBottom: '1.75rem' }}>
          Upper trigram: {h.upperTrigram} · Lower trigram: {h.lowerTrigram}
        </p>
      </header>
      <section style={{ border: '1px solid rgba(245,240,232,0.08)', padding: '1rem', borderRadius: 14 }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--color-gold)', fontWeight: 500 }}>Judgment</h2>
        <pre style={{ margin: '0.5rem 0 1rem', fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>{h.judgment}</pre>
        <h2 style={{ fontSize: '1rem', color: 'var(--color-gold)', fontWeight: 500 }}>Image</h2>
        <pre style={{ margin: '0.5rem 0 1rem', fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>{h.image}</pre>
      </section>
      <section style={{ marginTop: '1.5rem', color: 'var(--color-ivory)', fontSize: '0.95rem' }}>
        <p>{h.judgmentExplain}</p>
      </section>
      <section style={{ marginTop: '1.75rem', color: 'var(--color-ivory-muted)', fontSize: '0.86rem' }}>
        <strong>Keywords</strong> ·{' '}
        {h.keywords.map((kw, idx) => (
          <span key={kw}>
            {idx ? ' · ' : ''}
            {kw}
          </span>
        ))}
      </section>
      <details style={{ marginTop: '1.75rem', color: 'var(--color-ivory-muted)' }}>
        <summary>Show line texts · 爻辞</summary>
        <ul style={{ marginTop: '0.75rem' }}>
          {h.lines.map((l) => (
            <li key={l} style={{ marginBottom: '0.35rem' }}>
              {l}
            </li>
          ))}
        </ul>
      </details>
      <p style={{ marginTop: '2rem', fontSize: '0.78rem', color: 'var(--color-ivory-muted)', lineHeight: 1.6 }}>
        Canonical Chinese text surfaced for citation. Literary English polish ships inside HexAstral / CoinCast
        interpretive UX. Provided for scholarship and mindfulness — never for guaranteed outcomes.
      </p>
      <footer style={{ marginTop: '1.75rem', fontSize: '0.9rem' }}>
        Explore all 64 hexagrams via{' '}
        <Link href='/tools/hexagram' style={{ color: 'var(--color-gold)' }}>
          /tools/hexagram
        </Link>
      </footer>
    </article>
  )
}
