/**
 * Locale-aware navigation utilities from next-intl.
 *
 * Import Link, redirect, useRouter etc from here instead of 'next/link'
 * so href values automatically include the current locale prefix.
 *
 * Usage (server component):
 *   import { Link } from '@/i18n/navigation'
 *   <Link href="/onboarding">Start</Link>  → /zh/onboarding (or just /onboarding for en)
 *
 * Usage (client component):
 *   import { useRouter } from '@/i18n/navigation'
 *   const router = useRouter()
 *   router.push('/onboarding')  → /zh/onboarding (or just /onboarding for en)
 */

import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
