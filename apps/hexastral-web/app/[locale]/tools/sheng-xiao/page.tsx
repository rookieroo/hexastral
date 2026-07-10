import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ShengXiaoYearTool } from '@/app/[locale]/tools/sheng-xiao/ShengXiaoYearTool'
import { DownloadCTA } from '@/components/DownloadCTA'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'
import { canonicalUrl } from '@/lib/growth/page-metadata'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'tools.shengXiao' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: canonicalUrl(locale, '/tools/sheng-xiao'),
    },
  }
}

export default async function ShengXiaoToolPage() {
  const t = await getTranslations('tools.shengXiao')
  return (
    <>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, marginTop: 0 }}>{t('heading')}</h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.65 }}>{t('introPage')}</p>
      <ShengXiaoYearTool />
      <DownloadCTA
        headline={t('ctaHeadline')}
        sub={t('ctaSub')}
        appStoreUrl={resolveAppStoreUrl('auspice')}
        targetApp='auspice'
      />
    </>
  )
}
