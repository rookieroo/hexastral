import type { Metadata } from 'next'
import { isPathIndexable } from './launch-status'

/** Robots directive for SKUs/routes outside the current launch wave. */
export const NOINDEX_ROBOTS: Metadata['robots'] = { index: false, follow: false }

export function robotsForPath(path: string): Metadata['robots'] {
  return isPathIndexable(path) ? { index: true, follow: true } : NOINDEX_ROBOTS
}

export function canonicalUrl(locale: string, path: string): string {
  const base = 'https://hexastral.com'
  if (locale === 'en') return `${base}${path}`
  return `${base}/${locale}${path}`
}
