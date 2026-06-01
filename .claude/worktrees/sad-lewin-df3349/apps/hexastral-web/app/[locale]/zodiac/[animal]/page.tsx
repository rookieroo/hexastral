import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { DownloadCTA } from '@/components/DownloadCTA'
import { zodiacPages } from '@/lib/growth/reference-content'
import { ZODIAC_SLUGS, type ZodiacSlug } from '@/lib/growth/seo-data'

interface Props {
  params: Promise<{ locale: string; animal: string }>
}

export function generateStaticParams() {
  return ZODIAC_SLUGS.map((animal) => ({ animal }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, animal } = await params
  if (!ZODIAC_SLUGS.includes(animal as ZodiacSlug)) return { title: 'Chinese zodiac · HexAstral' }
  const z = zodiacPages[animal as ZodiacSlug]
  return {
    title: `Chinese zodiac · ${animal.replace(/-/g, ' ')} (${z.han})`,
    description: z.blurb,
    alternates: {
      canonical:
        locale === 'en'
          ? `https://hexastral.com/zodiac/${animal}`
          : `https://hexastral.com/${locale}/zodiac/${animal}`,
    },
  }
}

export default async function ZodiacReferencePage({ params }: Props) {
  const { animal } = await params
  if (!ZODIAC_SLUGS.includes(animal as ZodiacSlug)) notFound()
  const z = zodiacPages[animal as ZodiacSlug]

  return (
    <article>
      <header>
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.18em', color: 'var(--color-gold)' }}>
          SHENG XIAO · 生肖
        </p>
        <h1 style={{ fontWeight: 400, fontSize: '1.85rem', margin: '0.25rem 0' }}>
          {animal.replace(/-/g, ' ')}{' '}
          <span style={{ color: 'var(--color-ivory-dim)', fontSize: '1.05rem' }}>
            ({z.han}) · {z.pinyin}
          </span>
        </h1>
      </header>
      <p style={{ lineHeight: 1.75 }}>{z.blurb}</p>
      <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--color-ivory-muted)' }}>
        <Link href='/tools/zodiac' style={{ color: 'var(--color-gold)' }}>
          Year lookup tool →
        </Link>
      </div>
      <DownloadCTA headline='Need Ba Zi precision?' sub='Zodiac is fun; Four Pillars encode the full architecture.' />
    </article>
  )
}
