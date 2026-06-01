import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DownloadCTA } from '@/components/DownloadCTA'
import { Link } from '@/i18n/navigation'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'
import { palacePages } from '@/lib/growth/reference-content'
import { PALACE_SLUGS, type PalaceSlug } from '@/lib/growth/seo-data'
import { JsonLd } from '@/lib/json-ld'

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export function generateStaticParams() {
  return PALACE_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!PALACE_SLUGS.includes(slug as PalaceSlug)) return { title: 'Zi Wei palace · HexAstral' }
  const p = palacePages[slug as PalaceSlug]
  return {
    title: `${p.english} · Zi Wei Dou Shu (${p.han})`,
    description: p.blurb,
    alternates: {
      canonical:
        locale === 'en'
          ? `https://hexastral.com/palace/${slug}`
          : `https://hexastral.com/${locale}/palace/${slug}`,
    },
  }
}

export default async function PalaceReferencePage({ params }: Props) {
  const { slug } = await params
  if (!PALACE_SLUGS.includes(slug as PalaceSlug)) notFound()
  const p = palacePages[slug as PalaceSlug]

  return (
    <article>
      <JsonLd
        json={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: `What does the ${p.english} (${p.han}) mean in Zi Wei Dou Shu?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: p.blurb,
              },
            },
          ],
        }}
      />
      <header>
        <p
          style={{
            letterSpacing: '0.2em',
            color: 'var(--color-gold)',
            fontSize: '0.73rem',
            marginBottom: '0.35rem',
          }}
        >
          STAR PALACE · 宫位
        </p>
        <h1 style={{ fontWeight: 400, margin: '0 0 0.35rem', fontSize: '1.8rem' }}>{p.english}</h1>
        <p style={{ color: 'var(--color-ivory-dim)' }}>
          {p.han} · {p.pinyin}
        </p>
      </header>
      <p style={{ lineHeight: 1.75 }}>{p.blurb}</p>
      <Link
        href='/tools/palace-chart'
        style={{
          color: 'var(--color-gold)',
          fontSize: '0.85rem',
          display: 'inline-block',
          marginTop: '1rem',
        }}
      >
        Explore palace overview →
      </Link>
      <DownloadCTA
        headline='Plot this palace with real stars'
        sub='StarPalace & HexAstral compute classical layouts + commentary.'
        appStoreUrl={resolveAppStoreUrl('starpalace')}
        targetApp='starpalace'
      />
    </article>
  )
}
