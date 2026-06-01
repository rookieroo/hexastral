import type { Metadata } from 'next'
import { DownloadCTA } from '@/components/DownloadCTA'
import { Link } from '@/i18n/navigation'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'
import { PALACE_SLUGS } from '@/lib/growth/seo-data'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Twelve Star Palaces preview — Zi Wei Dou Shu 紫微斗数',
    description:
      'Learn the palace grid before plotting a live chart inside StarPalace or HexAstral. Each palace names a slice of embodied life.',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/tools/palace-chart'
          : `https://hexastral.com/${locale}/tools/palace-chart`,
    },
  }
}

export default async function PalaceChartIntroPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  await params

  return (
    <>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, marginTop: 0 }}>
        Zi Wei palace map · 紫微十二宫
      </h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.65 }}>
        Zi Wei Dou Shu fans often compare this to twelve astrological houses: each palace becomes a
        semantic container for stars, transformers (四化 sì huà), and timing overlays like decade
        cycles (<em>大运 dà yùn</em>).
      </p>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-gold)' }}>Starter trio for discovery</p>
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}
      >
        {PALACE_SLUGS.filter((slug) => ['life-palace', 'career', 'spouse'].includes(slug)).map(
          (slug) => (
            <Link
              key={slug}
              href={`/palace/${slug}`}
              prefetch={false}
              style={{ color: 'var(--color-gold)', textDecoration: 'none' }}
            >
              Read {slug.replace(/-/g, ' ')} palace →
            </Link>
          )
        )}
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-ivory-muted)' }}>
        Full indexed list: browse all twelve under /palace/… programmatic routes.
      </p>
      <DownloadCTA
        headline='StarPalace launches next in the constellation'
        sub='Daily palace-style dispatches mirror Co-Star pacing but keep Chinese star names citeable.'
        appStoreUrl={resolveAppStoreUrl('starpalace')}
        targetApp='starpalace'
      />
      <DownloadCTA
        headline='Charts already plotting in HexAstral flagship'
        compact
        targetApp='hexastral'
      />
    </>
  )
}
