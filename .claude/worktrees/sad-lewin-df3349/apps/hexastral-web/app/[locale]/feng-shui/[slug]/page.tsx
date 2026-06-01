import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DownloadCTA } from '@/components/DownloadCTA'
import { fengShuiPages } from '@/lib/growth/reference-content'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'
import { FENG_SHUI_SLUGS, type FengShuiSlug } from '@/lib/growth/seo-data'

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export function generateStaticParams() {
  return FENG_SHUI_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!FENG_SHUI_SLUGS.includes(slug as FengShuiSlug)) return { title: 'Feng shui · HexAstral' }
  const pg = fengShuiPages[slug as FengShuiSlug]
  return {
    title: `${pg.title} — HexAstral`,
    description: pg.blurb,
    alternates: {
      canonical:
        locale === 'en'
          ? `https://hexastral.com/feng-shui/${slug}`
          : `https://hexastral.com/${locale}/feng-shui/${slug}`,
    },
  }
}

export default async function FengShuiGuidePage({ params }: Props) {
  const { slug } = await params
  if (!FENG_SHUI_SLUGS.includes(slug as FengShuiSlug)) notFound()
  const pg = fengShuiPages[slug as FengShuiSlug]

  return (
    <article>
      <h1 style={{ fontWeight: 400, marginTop: 0 }}>{pg.title}</h1>
      <p style={{ lineHeight: 1.75, color: 'var(--color-ivory)', fontSize: '0.95rem' }}>{pg.blurb}</p>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-ivory-muted)', marginTop: '1rem' }}>
        Architectural, electrical, or structural decisions still belong to licensed professionals. FengShui AI is being
        designed for spatial journaling + classical overlays — not supernatural guarantees.
      </p>
      <DownloadCTA
        headline='FengShui AI waitlist funnel'
        sub='Compass-aware rooms arrive as the standalone app passes review.'
        appStoreUrl={resolveAppStoreUrl('fengshui')}
        targetApp='fengshui'
      />
    </article>
  )
}
