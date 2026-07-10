import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CompatibilityTeaser } from '@/app/[locale]/tools/compatibility/CompatibilityTeaser'
import { canonicalUrl } from '@/lib/growth/page-metadata'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'tools.compatibility' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: canonicalUrl(locale, '/tools/compatibility'),
    },
  }
}

export default async function CompatibilityToolPage() {
  const t = await getTranslations('tools.compatibility')
  return (
    <>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, marginTop: 0 }}>{t('heading')}</h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.65 }}>{t('intro')}</p>
      <CompatibilityTeaser />
    </>
  )
}
