import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DownloadCTA } from '@/components/DownloadCTA'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'
import { appIsPublicSurface } from '@/lib/growth/launch-status'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Yuun · Chinese almanac',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/lp/yuun'
          : `https://hexastral.com/${locale}/lp/yuun`,
    },
  }
}

export default async function LpYuunPage({ params }: Props) {
  const { locale } = await params
  if (!appIsPublicSurface('yuun')) {
    redirect(locale === 'en' ? '/' : `/${locale}`)
  }
  return (
    <>
      <h1 style={{ fontWeight: 400 }}>Today&apos;s 黄历 — free for everyone</h1>
      <p style={{ color: 'var(--color-ivory-dim)' }}>
        Public 宜忌 on Home, Lock Screen, and Apple Watch. Add birth info for a free For you
        summary. Pro deepens reasons, timeline, and calendar — cultural reference, not prediction.
      </p>
      <DownloadCTA
        headline='Yuun — free public almanac; For you when you add birth'
        appStoreUrl={resolveAppStoreUrl('auspice')}
        targetApp='auspice'
      />
    </>
  )
}
