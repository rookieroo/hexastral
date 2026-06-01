import { getTranslations } from 'next-intl/server'

import type { GrowthNavLabels } from '@/components/growth/GrowthShell'

export async function getMarketingNav(): Promise<GrowthNavLabels> {
  const g = await getTranslations('growth')
  const n = await getTranslations('nav')
  return {
    home: g('navHome'),
    tools: g('navTools'),
    blog: g('navBlog'),
    methodology: g('navMethodology'),
    freeReading: n('freeReading'),
    download: n('download'),
  }
}
