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
    title: 'Yuel · relationship charts',
    alternates: {
      canonical:
        locale === 'en' ? 'https://hexastral.com/lp/yuel' : `https://hexastral.com/${locale}/lp/yuel`,
    },
  }
}

export default async function LpYuelPage({ params }: Props) {
  const { locale } = await params
  if (!appIsPublicSurface('yuel')) {
    redirect(locale === 'en' ? '/' : `/${locale}`)
  }
  return (
    <>
      <h1 style={{ fontWeight: 400 }}>Two charts, one bond</h1>
      <p style={{ color: 'var(--color-ivory-dim)' }}>
        Yuel compares Ba Zi charts for cultural exploration and reflection — not a score or
        prediction. Former /yuan links now point here.
      </p>
      <DownloadCTA
        headline='Yuel — pair charts as a habit'
        appStoreUrl={resolveAppStoreUrl('soulmatch')}
        targetApp='soulmatch'
      />
    </>
  )
}
