import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DownloadCTA } from '@/components/DownloadCTA'
import { Link } from '@/i18n/navigation'
import { dayMasterPages } from '@/lib/growth/reference-content'
import { DAY_MASTER_SLUGS, type DayMasterSlug } from '@/lib/growth/seo-data'
import { JsonLd } from '@/lib/json-ld'

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export function generateStaticParams() {
  return DAY_MASTER_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!DAY_MASTER_SLUGS.includes(slug as DayMasterSlug)) return { title: 'Day Master · HexAstral' }
  const dm = dayMasterPages[slug as DayMasterSlug]
  return {
    title: `${dm.english} (${dm.han} ${dm.pinyin}) — Ba Zi Day Master · HexAstral`,
    description: dm.blurb,
    alternates: {
      canonical:
        locale === 'en'
          ? `https://hexastral.com/day-master/${slug}`
          : `https://hexastral.com/${locale}/day-master/${slug}`,
    },
  }
}

export default async function DayMasterReferencePage({ params }: Props) {
  const { slug } = await params
  if (!DAY_MASTER_SLUGS.includes(slug as DayMasterSlug)) notFound()
  const dm = dayMasterPages[slug as DayMasterSlug]

  const faqJson = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What does ${dm.han} (${dm.pinyin}) represent in Ba Zi?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: dm.blurb,
        },
      },
      {
        '@type': 'Question',
        name: 'Is this destiny fixed?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Ba Zi reads tendencies and timing; choices, geography, and relationships reshape outcomes. HexAstral presents AI-assisted cultural exploration, not deterministic prediction.',
        },
      },
    ],
  }

  return (
    <article>
      <JsonLd json={faqJson} />
      <header>
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--color-gold)' }}>
          DAY MASTER · 日元
        </p>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 400, margin: '0.25rem 0' }}>
          {dm.english}{' '}
          <span style={{ color: 'var(--color-ivory-dim)', fontSize: '1.05rem' }}>
            {dm.han} · {dm.pinyin}
          </span>
        </h1>
        <p style={{ color: 'var(--color-gold)', fontSize: '0.92rem' }}>
          Element focus: {dm.element}
        </p>
      </header>
      <p
        style={{
          marginTop: '1.25rem',
          lineHeight: 1.75,
          color: 'var(--color-ivory)',
          fontSize: '0.96rem',
        }}
      >
        {dm.blurb}
      </p>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-ivory-muted)', marginTop: '1.5rem' }}>
        Want the fully corrected pillars? Run the{' '}
        <Link href='/tools/day-master' style={{ color: 'var(--color-gold)' }}>
          lite calculator
        </Link>{' '}
        then graduate to the flagship app for true solar time + Zi Wei overlays.
      </p>
      <DownloadCTA
        headline='HexAstral dual-chart engine'
        sub='Ba Zi × Zi Wei × Bonds — already live on iOS.'
        compact
      />
    </article>
  )
}
