import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { canonicalUrl } from '@/lib/growth/page-metadata'

interface PageProps {
  params: Promise<{ locale: string }>
}

const INDEX_TOOL_KEYS = [
  'dayMaster',
  'hexagram',
  'shengXiao',
  'compatibility',
] as const

const INDEX_TOOL_HREFS: Record<(typeof INDEX_TOOL_KEYS)[number], string> = {
  dayMaster: '/tools/day-master',
  hexagram: '/tools/hexagram',
  shengXiao: '/tools/sheng-xiao',
  compatibility: '/tools/compatibility',
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'tools.index' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: canonicalUrl(locale, '/tools'),
    },
  }
}

const cardStyle: React.CSSProperties = {
  display: 'block',
  padding: '1.25rem',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  textDecoration: 'none',
  color: 'inherit',
  background: 'rgba(255,255,255,0.03)',
}

export default async function ToolsIndexPage() {
  const t = await getTranslations('growth')
  const ti = await getTranslations('tools.index')

  return (
    <>
      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--color-gold)',
          letterSpacing: '0.16em',
          margin: '0 0 0.35rem',
        }}
      >
        HEXASTRAL
      </p>
      <h1 style={{ fontSize: '1.85rem', fontWeight: 400, margin: '0 0 0.5rem' }}>
        {t('toolsIndexTitle')}
      </h1>
      <p style={{ color: 'var(--color-ivory-dim)', margin: '0 0 2rem', lineHeight: 1.65 }}>
        {t('toolsIndexSubtitle')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {INDEX_TOOL_KEYS.map((key) => (
          <Link key={key} href={INDEX_TOOL_HREFS[key]} style={cardStyle}>
            <span
              style={{
                fontSize: '1.05rem',
                color: 'var(--color-ivory)',
                display: 'block',
                marginBottom: '0.35rem',
              }}
            >
              {ti(`${key}.title`)}
            </span>
            <span
              style={{ fontSize: '0.85rem', color: 'var(--color-ivory-dim)', lineHeight: 1.55 }}
            >
              {ti(`${key}.desc`)}
            </span>
          </Link>
        ))}
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-ivory-muted)', marginTop: '2rem' }}>
        {t('disclaimer')}
      </p>
    </>
  )
}
