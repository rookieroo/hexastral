import { HEXAGRAM_LIST } from '@zhop/hexastral-tokens/constants/hexagram'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { DownloadCTA } from '@/components/DownloadCTA'
import { Link } from '@/i18n/navigation'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'
import { canonicalUrl } from '@/lib/growth/page-metadata'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'tools.hexagram' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: canonicalUrl(locale, '/tools/hexagram'),
    },
  }
}

export default async function HexagramIndexPage() {
  const t = await getTranslations('tools.hexagram')

  return (
    <>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, marginTop: 0 }}>{t('heading')}</h1>
      <p style={{ color: 'var(--color-ivory-dim)', marginBottom: '1.25rem', lineHeight: 1.65 }}>
        {t('intro')}
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
          headline={t('ctaHeadline')}
          sub={t('ctaSub')}
          appStoreUrl={resolveAppStoreUrl('auspice')}
          targetApp='auspice'
        />
      </div>
    </>
  )
}
