import type { Metadata } from 'next'
import { NOINDEX_ROBOTS } from '@/lib/growth/page-metadata'

export const metadata: Metadata = {
  robots: NOINDEX_ROBOTS,
}

export default function FaceOracleLayout({ children }: { children: React.ReactNode }) {
  return children
}
