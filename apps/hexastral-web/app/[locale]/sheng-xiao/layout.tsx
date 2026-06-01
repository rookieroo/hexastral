import { GrowthShell } from '@/components/growth/GrowthShell'
import { getMarketingNav } from '@/lib/growth/get-marketing-nav'

export default async function ZodiacLayout({ children }: { children: React.ReactNode }) {
  const nav = await getMarketingNav()
  return <GrowthShell nav={nav}>{children}</GrowthShell>
}
