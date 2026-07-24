/**
 * Acquisition surface tags for brand / LP pages.
 * Reopen & legal surfaces must not load pixels or enqueue store CTA postbacks.
 */

export type WebTrafficSurface = 'brand_acq' | 'lp_acq' | 'lp_reopen' | 'legal' | 'resonate' | 'other'

/** Pathname without locale prefix (e.g. /lp/yuel, /lp/hexagram/foo). */
export function classifyWebSurface(pathname: string): WebTrafficSurface {
  const path = pathname.replace(/^\/(zh|tw|ja)(?=\/)/, '') || '/'

  if (path.startsWith('/privacy') || path.startsWith('/terms')) return 'legal'
  if (path.startsWith('/resonate')) return 'resonate'
  if (path.startsWith('/lp/hexagram')) return 'lp_reopen'

  // Thin acquisition LPs (brand slugs + legacy marketing tools)
  if (
    path === '/lp/yuel' ||
    path.startsWith('/lp/yuel/') ||
    path === '/lp/yuun' ||
    path.startsWith('/lp/yuun/') ||
    path === '/lp/kanyu' ||
    path.startsWith('/lp/kanyu/') ||
    path === '/lp/compatibility' ||
    path.startsWith('/lp/compatibility/') ||
    path === '/lp/face' ||
    path.startsWith('/lp/face/') ||
    path === '/lp/dream' ||
    path.startsWith('/lp/dream/') ||
    path === '/lp/personality' ||
    path.startsWith('/lp/personality/') ||
    path === '/lp/twelve-palaces' ||
    path.startsWith('/lp/twelve-palaces/')
  ) {
    return 'lp_acq'
  }

  if (path.startsWith('/lp/')) return 'lp_reopen'
  return 'other'
}

export function surfaceAllowsAdPixels(surface: WebTrafficSurface): boolean {
  return surface === 'brand_acq' || surface === 'lp_acq'
}
