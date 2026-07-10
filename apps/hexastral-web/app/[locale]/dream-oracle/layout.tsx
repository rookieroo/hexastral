import type { Metadata } from 'next'
import { NOINDEX_ROBOTS } from '@/lib/growth/page-metadata'

export const metadata: Metadata = {
  robots: NOINDEX_ROBOTS,
}

export default function DreamOracleLayout({ children }: { children: React.ReactNode }) {
  return children
}
