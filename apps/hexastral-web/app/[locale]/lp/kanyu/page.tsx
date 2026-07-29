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
    title: 'Kanyu · site study',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/lp/kanyu'
          : `https://hexastral.com/${locale}/lp/kanyu`,
    },
  }
}

export default async function LpKanyuPage({ params }: Props) {
  const { locale } = await params
  if (!appIsPublicSurface('kanyu')) {
    redirect(locale === 'en' ? '/' : `/${locale}`)
  }
  return (
    <>
      <h1 style={{ fontWeight: 400 }}>Read a space through classical 堪舆</h1>
      <p style={{ color: 'var(--color-ivory-dim)' }}>
        Kanyu turns a pin and facing into a structured feng-shui study report — cultural and
        educational, not on-site professional advice. Former /feng links now point here.
      </p>
      <DownloadCTA
        headline='Kanyu — map your space'
        appStoreUrl={resolveAppStoreUrl('fengshui')}
        targetApp='fengshui'
      />
    </>
  )
}
