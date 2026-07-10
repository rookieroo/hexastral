import type { Metadata } from 'next'
import { NOINDEX_ROBOTS } from '@/lib/growth/page-metadata'

export const metadata: Metadata = {
  robots: NOINDEX_ROBOTS,
  title: 'Onboarding · HexAstral',
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children
}
