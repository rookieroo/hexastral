import { headers } from 'next/headers'
import { AdPixels } from '@/components/ads/AdPixels'
import { GrowthShell } from '@/components/growth/GrowthShell'
import type { WebTrafficSurface } from '@/lib/ads/surface'
import { surfaceAllowsAdPixels } from '@/lib/ads/surface'
import { getMarketingNav } from '@/lib/growth/get-marketing-nav'

function parseSurface(raw: string | null): WebTrafficSurface {
  if (
    raw === 'brand_acq' ||
    raw === 'lp_acq' ||
    raw === 'lp_reopen' ||
    raw === 'legal' ||
    raw === 'resonate' ||
    raw === 'other'
  ) {
    return raw
  }
  return 'other'
}

export default async function LpLayout({ children }: { children: React.ReactNode }) {
  const nav = await getMarketingNav()
  const surface = parseSurface((await headers()).get('x-traffic-surface'))
  const showPixels = surfaceAllowsAdPixels(surface)

  return (
    <GrowthShell nav={nav}>
      {showPixels ? <AdPixels /> : null}
      <div data-traffic-surface={surface}>{children}</div>
    </GrowthShell>
  )
}
