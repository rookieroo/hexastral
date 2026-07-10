import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { DayMasterCalculator } from '@/app/[locale]/tools/day-master/DayMasterCalculator'
import { canonicalUrl } from '@/lib/growth/page-metadata'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'tools.dayMaster' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: canonicalUrl(locale, '/tools/day-master'),
    },
  }
}

export default async function DayMasterToolPage() {
  const t = await getTranslations('tools.dayMaster')
  return (
    <>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, marginTop: 0 }}>{t('heading')}</h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.65 }}>{t('intro')}</p>
      <DayMasterCalculator />
    </>
  )
}
