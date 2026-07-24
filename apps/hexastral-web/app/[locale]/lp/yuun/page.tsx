import type { Metadata } from 'next'
import { DownloadCTA } from '@/components/DownloadCTA'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Yuun · Chinese almanac',
    alternates: {
      canonical:
        locale === 'en' ? 'https://hexastral.com/lp/yuun' : `https://hexastral.com/${locale}/lp/yuun`,
    },
  }
}

export default async function LpYuunPage() {
  return (
    <>
      <h1 style={{ fontWeight: 400 }}>Today&apos;s 黄历, for everyday planning</h1>
      <p style={{ color: 'var(--color-ivory-dim)' }}>
        Yuun is a Chinese almanac for yi/ji, solar terms, and an optional personal layer from your
        chart — cultural reference, not prediction.
      </p>
      <DownloadCTA
        headline='Yuun — plan the day with the almanac'
        appStoreUrl={resolveAppStoreUrl('auspice')}
        targetApp='auspice'
      />
    </>
  )
}
